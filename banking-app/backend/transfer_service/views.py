# transfer_service/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth.decorators import login_required
from django.db import transaction
from decimal import Decimal
import json
from .models import Transfer, TransferHistory
from account_service.models import Account
from auth_service.models import User
from django.utils import timezone
import uuid
import re
from django.db.models import Q

@csrf_exempt
@login_required
@require_POST
def make_transfer(request):
    """Effectuer un virement bancaire"""
    print(f"💸 TRANSFER REQUEST from {request.user.email}")
    
    try:
        # Parse request data
        data = json.loads(request.body)
        recipient_rib = data.get('recipient_rib', '').strip().upper()
        amount = Decimal(str(data.get('amount', 0)))
        description = data.get('description', '').strip()
        currency = data.get('currency', 'TND')
        
        print(f"📦 Transfer data: RIB={recipient_rib}, Amount={amount}, Desc={description}")
        
        # Validation
        if not recipient_rib:
            return JsonResponse({
                'success': False,
                'error': 'RIB du bénéficiaire requis'
            }, status=400)
        
        if amount <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Le montant doit être positif'
            }, status=400)
        
        # Nettoyer le RIB (enlever les espaces)
        recipient_rib = recipient_rib.replace(' ', '')
        
        # Validation RIB (format tunisien)
        if len(recipient_rib) != 24 or not recipient_rib.startswith('TN'):
            return JsonResponse({
                'success': False,
                'error': 'RIB invalide. Format attendu: TN + 22 chiffres (ex: TN9086419656355048625449)'
            }, status=400)
        
        if not recipient_rib[2:].isdigit():
            return JsonResponse({
                'success': False,
                'error': 'RIB invalide. Seuls les chiffres sont autorisés après TN'
            }, status=400)
        
        if len(recipient_rib[2:]) != 22:
            return JsonResponse({
                'success': False,
                'error': 'RIB invalide. Format attendu: TN + 22 chiffres (ex: TN9086419656355048625449)'
            }, status=400)
        
        # Récupérer le compte de l'expéditeur
        try:
            sender_account = request.user.account
        except Account.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Compte expéditeur non trouvé'
            }, status=404)
        
        # Vérifier le solde
        if sender_account.balance < amount:
            return JsonResponse({
                'success': False,
                'error': f'Solde insuffisant. Solde disponible: {sender_account.balance}DT'
            }, status=400)
        
        # Vérifier si le RIB existe dans notre système
        recipient_account = None
        try:
            # Chercher par RIB exact (sans espaces)
            recipient_account = Account.objects.get(rib=recipient_rib)
            print(f"✅ Compte bénéficiaire trouvé: {recipient_account.user.email}")
        except Account.DoesNotExist:
            # RIB externe - autorisé
            print(f"🌐 RIB externe détecté: {recipient_rib}")
            recipient_account = None
        
        # ⭐⭐ TRANSACTION ATOMIQUE
        with transaction.atomic():
            # 1. Débiter le compte expéditeur
            sender_account.balance -= amount
            sender_account.save()
            
            # 2. Créditer le compte bénéficiaire (s'il existe dans notre système)
            if recipient_account:
                recipient_account.balance += amount
                recipient_account.save()
            
            # 3. Créer l'enregistrement de transfert
            transfer = Transfer.objects.create(
                sender=request.user,
                recipient_account=recipient_account,
                recipient_rib=recipient_rib,
                amount=amount,
                currency=currency,
                description=description,
                status='completed',
                completed_at=timezone.now()
            )
            
            # 4. Historique
            TransferHistory.objects.create(
                transfer=transfer,
                status='completed',
                details=f'Virement de {amount}DT vers {recipient_rib}'
            )
        
        print(f"✅ TRANSFER COMPLETED: {transfer.reference}")
        
        return JsonResponse({
            'success': True,
            'message': 'Virement effectué avec succès',
            'transfer': {
                'id': str(transfer.id),
                'reference': transfer.reference,
                'amount': float(transfer.amount),
                'currency': transfer.currency,
                'recipient_rib': transfer.recipient_rib,
                'description': transfer.description,
                'status': transfer.status,
                'created_at': transfer.created_at.isoformat(),
                'new_balance': float(sender_account.balance)
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Données JSON invalides'
        }, status=400)
    except Exception as e:
        print(f"❌ TRANSFER ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': f'Erreur serveur: {str(e)}'
        }, status=500)

# Fonction utilitaire pour formater le RIB tunisien
def format_tunisian_rib(rib):
    """Formate un RIB tunisien pour l'affichage (TN XX XXXX XXXX XXXX XXXX XXXX)"""
    if not rib or len(rib) != 24:
        return rib
    
    # Ajouter des espaces tous les 4 caractères après "TN"
    formatted = rib[:2]  # "TN"
    for i in range(2, len(rib), 4):
        formatted += ' ' + rib[i:i+4]
    
    return formatted.strip()

@csrf_exempt
@login_required
@require_GET
def get_transfers(request):
    """Récupérer l'historique des virements (en tant qu'expéditeur)"""
    try:
        # Pagination
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 10))
        offset = (page - 1) * limit
        
        # Récupérer les transferts envoyés par l'utilisateur
        sent_transfers = Transfer.objects.filter(sender=request.user).order_by('-created_at')
        total_sent = sent_transfers.count()
        
        sent_transfers = sent_transfers[offset:offset + limit]
        
        sent_transfers_data = []
        for transfer in sent_transfers:
            sent_transfers_data.append({
                'id': str(transfer.id),
                'reference': transfer.reference,
                'amount': float(transfer.amount),
                'currency': transfer.currency,
                'recipient_rib': transfer.recipient_rib,  # RIB brut pour le frontend
                'description': transfer.description,
                'status': transfer.status,
                'direction': 'debit',  # Sortie d'argent
                'created_at': transfer.created_at.isoformat(),
                'completed_at': transfer.completed_at.isoformat() if transfer.completed_at else None,
                'is_external': transfer.recipient_account is None,
                'sender_id': str(transfer.sender.id),
                'sender_email': transfer.sender.email,
            })
        
        return JsonResponse({
            'success': True,
            'transfers': sent_transfers_data,  # Changé de 'transfers' pour être clair
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_sent,
                'pages': (total_sent + limit - 1) // limit
            }
        })
        
    except Exception as e:
        print(f"❌ GET TRANSFERS ERROR: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@login_required
@require_GET
def get_all_transactions(request):
    """Récupérer TOUTES les transactions de l'utilisateur (envoyées et reçues)"""
    try:
        # Pagination
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 10))
        offset = (page - 1) * limit
        
        user = request.user
        
        # 1. Transferts envoyés (débits)
        sent_transfers = Transfer.objects.filter(sender=user).order_by('-created_at')
        
        # 2. Transferts reçus (crédits) - seulement si le compte bénéficiaire existe dans notre système
        # Chercher d'abord le compte de l'utilisateur
        try:
            user_account = user.account
            # Trouver les transferts où cet utilisateur est le bénéficiaire
            received_transfers = Transfer.objects.filter(
                recipient_account=user_account
            ).order_by('-created_at')
        except Account.DoesNotExist:
            received_transfers = Transfer.objects.none()
        
        # Combiner les deux querysets
        all_transfers = sent_transfers.union(received_transfers).order_by('-created_at')
        
        total = all_transfers.count()
        transfers = all_transfers[offset:offset + limit]
        
        transactions_data = []
        for transfer in transfers:
            # Déterminer si c'est un débit (envoyé) ou crédit (reçu)
            if transfer.sender == user:
                direction = 'debit'
                counterparty_rib = transfer.recipient_rib
                description = transfer.description or f"Virement vers {transfer.recipient_rib[:10]}..."
            else:
                direction = 'credit'
                counterparty_rib = transfer.sender.account.rib if hasattr(transfer.sender, 'account') else transfer.recipient_rib
                description = transfer.description or f"Virement de {transfer.sender.email}"
            
            transactions_data.append({
                'id': str(transfer.id),
                'reference': transfer.reference,
                'amount': float(transfer.amount),
                'currency': transfer.currency,
                'counterparty_rib': counterparty_rib,  # RIB de l'autre partie
                'description': description,
                'status': transfer.status,
                'direction': direction,  # 'credit' ou 'debit'
                'created_at': transfer.created_at.isoformat(),
                'completed_at': transfer.completed_at.isoformat() if transfer.completed_at else None,
                'sender_id': str(transfer.sender.id),
                'sender_email': transfer.sender.email,
                'is_sender': transfer.sender == user,  # True si l'utilisateur est l'expéditeur
            })
        
        return JsonResponse({
            'success': True,
            'transactions': transactions_data,  # Nom clé: 'transactions' pour le frontend
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        print(f"❌ GET ALL TRANSACTIONS ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@login_required
@require_GET
def get_recent_transactions(request):
    """Récupérer les transactions récentes (limit à 10 par défaut)"""
    try:
        limit = int(request.GET.get('limit', 10))
        
        user = request.user
        
        # 1. Transferts envoyés
        sent_transfers = Transfer.objects.filter(sender=user).order_by('-created_at')[:limit]
        
        # 2. Transferts reçus
        try:
            user_account = user.account
            received_transfers = Transfer.objects.filter(
                recipient_account=user_account
            ).order_by('-created_at')[:limit]
        except Account.DoesNotExist:
            received_transfers = Transfer.objects.none()
        
        # Combiner et trier par date
        from itertools import chain
        all_transfers = sorted(
            chain(sent_transfers, received_transfers),
            key=lambda x: x.created_at,
            reverse=True
        )[:limit]
        
        transactions_data = []
        for transfer in all_transfers:
            if transfer.sender == user:
                direction = 'debit'
                counterparty_rib = transfer.recipient_rib
                description = transfer.description or "Virement sortant"
            else:
                direction = 'credit'
                counterparty_rib = transfer.sender.account.rib if hasattr(transfer.sender, 'account') else transfer.recipient_rib
                description = transfer.description or "Virement entrant"
            
            transactions_data.append({
                'id': str(transfer.id),
                'reference': transfer.reference,
                'amount': float(transfer.amount),
                'currency': transfer.currency,
                'counterparty_rib': counterparty_rib,
                'description': description,
                'status': transfer.status,
                'direction': direction,
                'created_at': transfer.created_at.isoformat(),
                'sender_id': str(transfer.sender.id),
                'sender_email': transfer.sender.email,
                'is_sender': transfer.sender == user,
            })
        
        return JsonResponse({
            'success': True,
            'transactions': transactions_data,
            'total': len(transactions_data)
        })
        
    except Exception as e:
        print(f"❌ GET RECENT TRANSACTIONS ERROR: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@login_required
@require_GET
def get_transfer_history(request):
    """Alias pour get_transfers - pour compatibilité avec le frontend existant"""
    return get_transfers(request)

@csrf_exempt
@login_required
@require_GET
def get_transfer_details(request, transfer_id):
    """Récupérer les détails d'un virement spécifique"""
    try:
        user = request.user
        
        # Chercher le transfert où l'utilisateur est soit l'expéditeur soit le destinataire
        transfer = Transfer.objects.filter(
            Q(sender=user) | Q(recipient_account__user=user)
        ).get(id=transfer_id)
        
        history = TransferHistory.objects.filter(transfer=transfer).order_by('-created_at')
        history_data = [
            {
                'status': h.status,
                'details': h.details,
                'created_at': h.created_at.isoformat()
            }
            for h in history
        ]
        
        # Déterminer la direction
        direction = 'debit' if transfer.sender == user else 'credit'
        
        # Déterminer le RIB de la contrepartie
        if transfer.sender == user:
            counterparty_rib = transfer.recipient_rib
        else:
            counterparty_rib = transfer.sender.account.rib if hasattr(transfer.sender, 'account') else transfer.recipient_rib
        
        return JsonResponse({
            'success': True,
            'transfer': {
                'id': str(transfer.id),
                'reference': transfer.reference,
                'amount': float(transfer.amount),
                'currency': transfer.currency,
                'counterparty_rib': counterparty_rib,
                'description': transfer.description,
                'status': transfer.status,
                'direction': direction,
                'created_at': transfer.created_at.isoformat(),
                'completed_at': transfer.completed_at.isoformat() if transfer.completed_at else None,
                'is_external': transfer.recipient_account is None,
                'sender_id': str(transfer.sender.id),
                'sender_email': transfer.sender.email,
                'history': history_data
            }
        })
        
    except Transfer.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Transfert non trouvé'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@login_required
@require_GET
def get_transaction_statistics(request):
    """Récupérer des statistiques sur les transactions"""
    try:
        user = request.user
        today = timezone.now().date()
        
        # Statistiques mensuelles
        from datetime import datetime, timedelta
        last_30_days = today - timedelta(days=30)
        
        # Transferts envoyés ce mois
        sent_this_month = Transfer.objects.filter(
            sender=user,
            created_at__gte=last_30_days
        )
        
        # Transferts reçus ce mois
        try:
            user_account = user.account
            received_this_month = Transfer.objects.filter(
                recipient_account=user_account,
                created_at__gte=last_30_days
            )
        except Account.DoesNotExist:
            received_this_month = Transfer.objects.none()
        
        # Calcul des totaux
        total_sent = sum(t.amount for t in sent_this_month)
        total_received = sum(t.amount for t in received_this_month)
        
        # Dernière transaction
        last_transaction = Transfer.objects.filter(
            Q(sender=user) | Q(recipient_account__user=user)
        ).order_by('-created_at').first()
        
        last_transaction_data = None
        if last_transaction:
            direction = 'debit' if last_transaction.sender == user else 'credit'
            last_transaction_data = {
                'amount': float(last_transaction.amount),
                'direction': direction,
                'date': last_transaction.created_at.isoformat(),
                'description': last_transaction.description
            }
        
        return JsonResponse({
            'success': True,
            'statistics': {
                'last_30_days': {
                    'sent': {
                        'count': sent_this_month.count(),
                        'total': float(total_sent)
                    },
                    'received': {
                        'count': received_this_month.count(),
                        'total': float(total_received)
                    },
                    'net_flow': float(total_received - total_sent)
                },
                'last_transaction': last_transaction_data,
                'account_balance': float(user.account.balance) if hasattr(user, 'account') else 0
            }
        })
        
    except Exception as e:
        print(f"❌ GET STATISTICS ERROR: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)