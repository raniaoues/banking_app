# transfer_service/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Virements
    path('', views.make_transfer, name='make_transfer'),  # POST pour créer un virement
    path('history/', views.get_transfer_history, name='transfer_history'),
    path('all/', views.get_transfers, name='get_transfers'),  # GET pour récupérer les virements envoyés
    
    # Transactions (endpoints pour le frontend)
    path('transactions/', views.get_all_transactions, name='get_all_transactions'),
    path('transactions/recent/', views.get_recent_transactions, name='get_recent_transactions'),
    path('transactions/statistics/', views.get_transaction_statistics, name='get_transaction_statistics'),
    
    # Détails spécifiques
    path('history/<uuid:transfer_id>/', views.get_transfer_details, name='transfer_details'),
]