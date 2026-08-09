from rest_framework import generics, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
import uuid

from .models import (
    Subscription,
    SubscriptionStatus,
    Transaction,
    TransactionStatus,
    PaymeState,
    Card,
    subscription_price_uzs,
    free_trial_days,
)
from .payme import checkout_url
from .serializers import (
    SubscriptionSerializer,
    TransactionSerializer,
    CardSerializer,
    AddCardSerializer,
)


class MySubscriptionView(generics.RetrieveAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        sub, _ = Subscription.objects.get_or_create(
            user=self.request.user,
            defaults={"expires_at": timezone.now() + timedelta(days=free_trial_days())},
        )
        return sub


class CardViewSet(viewsets.ModelViewSet):
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "delete"]

    def get_queryset(self):
        return Card.objects.filter(user=self.request.user)


class AddCardView(APIView):
    """Karta qo'shish va tasdiqlash uchun 1 sentlik test tranzaksiya."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddCardSerializer

    def post(self, request):
        serializer = AddCardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        last4 = d["card_number"][-4:]

        # Boshqa kartalarni default emas qilamiz
        Card.objects.filter(user=request.user).update(is_default=False)

        card = Card.objects.create(
            user=request.user,
            holder_name=d["holder_name"],
            card_last4=last4,
            expiry_month=d["expiry_month"],
            expiry_year=d["expiry_year"],
            card_type=d["card_type"],
            is_default=True,
            token=f"tok_{uuid.uuid4().hex[:24]}",
        )

        # Foydalanuvchidagi has_card va card_last4 ni yangilash
        request.user.has_card = True
        request.user.card_last4 = last4
        request.user.save(update_fields=["has_card", "card_last4"])

        # 1$ test tranzaksiya — olishga urinilgan, lekin yechilmagan
        Transaction.objects.create(
            user=request.user,
            amount_usd=1.00,
            amount_uzs=12500,
            status=TransactionStatus.SUCCESS,
            card_last4=last4,
            description="Karta tekshiruvi (1$ ushlab qaytarildi)",
            external_id=f"txn_{uuid.uuid4().hex[:16]}",
        )

        return Response(CardSerializer(card).data, status=status.HTTP_201_CREATED)


class PaymeCheckoutView(APIView):
    """Obuna to'lovi uchun Payme checkout havolasini yaratish.

    Karta ilovada kiritilmaydi — foydalanuvchi Payme oynasida to'laydi,
    Payme webhook orqali (PerformTransaction) obuna avtomatik uzayadi.
    Narx rolga bog'liq: yo'lovchi 9 999 so'm, haydovchi 49 999 so'm.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        sub, _ = Subscription.objects.get_or_create(
            user=request.user,
            defaults={"expires_at": timezone.now() + timedelta(days=free_trial_days())},
        )

        # Promo-kod chegirmasi (bo'lsa) — bir martalik, to'lov o'tgach nollanadi
        base_uzs = subscription_price_uzs(request.user)
        disc = sub.discount_percent or 0
        amount_uzs = max(1, int(base_uzs * (100 - disc) / 100))
        desc = "TaxiNarx oylik obuna" + (f" ({disc}% promo chegirma)" if disc else "")

        # Hali to'lanmagan eski checkout bo'lsa — qayta ishlatamiz (dublikat bo'lmasin)
        txn = Transaction.objects.filter(
            user=request.user,
            status=TransactionStatus.PENDING,
            payme_id="",
        ).first()
        if txn:
            txn.amount_uzs = amount_uzs
            txn.description = desc
            txn.subscription = sub
            txn.save(update_fields=["amount_uzs", "description", "subscription"])
        else:
            txn = Transaction.objects.create(
                user=request.user,
                subscription=sub,
                amount_usd=0,
                amount_uzs=amount_uzs,
                status=TransactionStatus.PENDING,
                description=desc,
            )

        return Response({
            "order_id": txn.id,
            "amount_uzs": amount_uzs,
            "checkout_url": checkout_url(txn.id, amount_uzs),
        })


class PaymeOrderStatusView(APIView):
    """Mobil ilova to'lov oynasi ochiq turganda holatni so'rab turadi."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        order_id = request.query_params.get("order_id")
        try:
            txn = Transaction.objects.get(id=int(order_id), user=request.user)
        except (Transaction.DoesNotExist, TypeError, ValueError):
            return Response({"detail": "Buyurtma topilmadi"}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "order_id": txn.id,
            "status": txn.status,
            "paid": txn.payme_state == PaymeState.PERFORMED,
        })


class CancelSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        sub = getattr(request.user, "subscription", None)
        if not sub:
            return Response(status=status.HTTP_404_NOT_FOUND)
        sub.auto_renew = False
        sub.status = SubscriptionStatus.CANCELED if sub.expires_at < timezone.now() else sub.status
        sub.save()
        return Response(SubscriptionSerializer(sub).data)


class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


from .models import PromoCode, PromoRedemption
from .serializers import PromoCodeSerializer, PromoRedemptionSerializer


class IsAdminRole(permissions.BasePermission):
    """Faqat admin/staff."""
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_staff or getattr(u, "role", "") == "admin"))


class PromoCodeAdminViewSet(viewsets.ModelViewSet):
    """Admin: promo-kod yaratish/ko'rish/tahrirlash/o'chirish."""
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsAdminRole]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        data = self.get_serializer(self.get_queryset(), many=True).data
        return Response({"results": data, "count": len(data)})


class RedeemPromoView(APIView):
    """Yo'lovchi/haydovchi promo-kodni kiritib obunaga bepul kun oladi."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = (request.data.get("code") or "").strip().upper()
        if not code:
            return Response({"detail": "Promo-kodni kiriting."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            promo = PromoCode.objects.get(code=code)
        except PromoCode.DoesNotExist:
            return Response({"detail": "Bunday promo-kod topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        ok, reason = promo.check_usable(request.user)
        if not ok:
            return Response({"detail": reason}, status=status.HTTP_400_BAD_REQUEST)

        sub, _ = Subscription.objects.get_or_create(
            user=request.user,
            defaults={"expires_at": timezone.now() + timedelta(days=free_trial_days())},
        )

        if promo.reward_type == "discount":
            # Keyingi obuna to'loviga chegirma (bir marta qo'llanadi)
            sub.discount_percent = min(100, promo.discount_percent)
            sub.save(update_fields=["discount_percent"])
            granted = 0
            detail = f"Chegirma faollashtirildi! Keyingi obuna to'lovida {promo.discount_percent}% chegirma."
        else:
            sub.extend(days=promo.free_days)
            granted = promo.free_days
            detail = f"Tabriklaymiz! Obunangizga {promo.free_days} kun qo'shildi."

        redemption = PromoRedemption.objects.create(
            user=request.user, promo=promo, status="applied",
            free_days_granted=granted,
        )
        promo.used_count += 1
        promo.save(update_fields=["used_count"])

        return Response({
            "detail": detail,
            "redemption": PromoRedemptionSerializer(redemption).data,
            "subscription": SubscriptionSerializer(sub).data,
        })


class MyPromoRedemptionsView(generics.ListAPIView):
    """Foydalanuvchining ishlatgan promo-kodlari (status bilan)."""
    serializer_class = PromoRedemptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        qs = PromoRedemption.objects.filter(user=request.user).select_related("promo")
        data = self.get_serializer(qs, many=True).data
        return Response({"results": data, "count": len(data)})
