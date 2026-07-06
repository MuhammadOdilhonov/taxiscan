from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MySubscriptionView,
    SubscribeView,
    CancelSubscriptionView,
    CardViewSet,
    AddCardView,
    TransactionListView,
    PromoCodeAdminViewSet,
    RedeemPromoView,
    MyPromoRedemptionsView,
)

router = DefaultRouter()
router.register(r"cards", CardViewSet, basename="card")
router.register(r"admin/promo-codes", PromoCodeAdminViewSet, basename="promo-code")

urlpatterns = [
    # Aniq yo'llar oldin bo'lishi kerak — DefaultRouter cards/<pk>/ ni ushlamasin
    path("cards/add/", AddCardView.as_view(), name="add-card"),
    path("subscription/", MySubscriptionView.as_view(), name="my-subscription"),
    path("subscribe/", SubscribeView.as_view(), name="subscribe"),
    path("cancel/", CancelSubscriptionView.as_view(), name="cancel-subscription"),
    path("transactions/", TransactionListView.as_view(), name="transactions"),
    # Promo-kod
    path("promo/redeem/", RedeemPromoView.as_view(), name="promo-redeem"),
    path("promo/mine/", MyPromoRedemptionsView.as_view(), name="promo-mine"),
    path("", include(router.urls)),
]
