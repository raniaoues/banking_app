# account_service/views.py - CORRIGEZ CETTE VERSION
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import json

# ============================================================================
# VERSION CORRIGÉE - Utilise l'authentification par session Django standard
# ============================================================================

@csrf_exempt  # Permettre les requêtes sans CSRF pour tests

def get_balance(request):
    """Version qui utilise l'authentification par session Django"""
    
    # DEBUG: Vérifier l'authentification
    print(f"=== GET BALANCE DEBUG ===")
    print(f"User: {request.user}")
    print(f"Authenticated: {request.user.is_authenticated}")
    print(f"Session ID: {request.session.session_key if hasattr(request.session, 'session_key') else 'None'}")
    print(f"Cookies: {request.COOKIES}")
    
    if not request.user.is_authenticated:
        return JsonResponse({
            "success": False,
            "error": "Authentication credentials were not provided.",
            "debug": {
                "user": str(request.user),
                "authenticated": False,
                "session_id": request.session.session_key if hasattr(request.session, 'session_key') else None,
            }
        }, status=401)
    
    try:
        account = request.user.account
        return JsonResponse({
            "success": True,
            "balance": float(account.balance),
            "rib": account.rib,
            "currency": account.currency if hasattr(account, 'currency') else 'EUR'
        })
    except AttributeError as e:
        return JsonResponse({
            "success": False,
            "error": f"No account found: {str(e)}"
        }, status=404)
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@csrf_exempt
@login_required(login_url=None)
def get_account_details(request):
    """Version corrigée pour les détails du compte"""
    if not request.user.is_authenticated:
        return JsonResponse({
            "success": False,
            "error": "Non authentifié"
        }, status=401)
    
    try:
        user = request.user
        account = user.account
        
        return JsonResponse({
            "success": True,
            "nom": user.nom if hasattr(user, 'nom') else user.last_name,
            "prenom": user.prenom if hasattr(user, 'prenom') else user.first_name,
            "email": user.email,
            "telephone": user.telephone if hasattr(user, 'telephone') else None,
            "rib": account.rib,
            "solde": float(account.balance),
            "currency": account.currency if hasattr(account, 'currency') else 'EUR',
        })
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

# ============================================================================
# ENDPOINT DE DEBUG (CRITIQUE)
# ============================================================================

@csrf_exempt
def debug_auth(request):
    """Endpoint pour déboguer l'authentification"""
    debug_info = {
        'authenticated': request.user.is_authenticated,
        'user': str(request.user),
        'user_id': request.user.id if request.user.is_authenticated else None,
        'user_email': request.user.email if request.user.is_authenticated else None,
        'session_key': request.session.session_key if hasattr(request.session, 'session_key') else None,
        'session_cookie_exists': 'sessionid' in request.COOKIES,
        'session_cookie_value': request.COOKIES.get('sessionid', 'NOT FOUND'),
        'csrf_cookie_exists': 'csrftoken' in request.COOKIES,
        'csrf_cookie_value': request.COOKIES.get('csrftoken', 'NOT FOUND'),
        'method': request.method,
        'path': request.path,
        'headers': {k: v for k, v in request.headers.items() if k.lower() not in ['cookie']},
        'cookies_received': dict(request.COOKIES),
    }
    
    # Log dans la console Django
    print(f"=== DEBUG AUTH ===")
    for key, value in debug_info.items():
        print(f"{key}: {value}")
    
    return JsonResponse(debug_info)