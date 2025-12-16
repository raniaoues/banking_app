# account_service/urls.py
from django.urls import path
from .views import get_balance, get_account_details, debug_auth

urlpatterns = [
    path('balance/', get_balance, name='account-balance'),
    path('details/', get_account_details, name='account-details'),
    path('debug/', debug_auth, name='account-debug'),  # IMPORTANT pour le debug
]