# auth_service/views.py - VERSION COMPLÈTE CORRIGÉE
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_POST, require_GET
from django.middleware.csrf import get_token
from .models import User
import json
import time

# ============================================================================
# INSCRIPTION (REGISTER)
# ============================================================================

@csrf_exempt
@require_POST
def register(request):
    """Inscription d'un nouvel utilisateur"""
    try:
        print("📥 [REGISTER] Inscription reçue")
        
        # Parser les données
        data = json.loads(request.body)
        
        # Extraire les données
        nom = data.get("nom", "").strip()
        prenom = data.get("prenom", "").strip()
        email = data.get("email", "").strip().lower()  # Normaliser en minuscule
        telephone = data.get("telephone", "").strip()
        password = data.get("password", "")
        
        print(f"   📋 Données: nom={nom}, prenom={prenom}, email={email}")
        
        # Validation
        if not all([nom, prenom, email, telephone, password]):
            return JsonResponse({
                "success": False,
                "error": "Tous les champs sont obligatoires"
            }, status=400)
        
        if len(password) < 6:
            return JsonResponse({
                "success": False,
                "error": "Le mot de passe doit contenir au moins 6 caractères"
            }, status=400)
        
        # Vérifier si l'email existe déjà
        if User.objects.filter(email=email).exists():
            return JsonResponse({
                "success": False,
                "error": "Cet email est déjà utilisé"
            }, status=400)
        
        # 🔥 Générer un username unique
        base_username = prenom.lower()
        username = base_username
        
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter:02d}"
            counter += 1
            if counter > 99:
                username = f"{base_username}{int(time.time())}"
                break
        
        print(f"   ✅ Username généré: {username}")
        
        # Créer l'utilisateur avec create_user (hash automatique du mot de passe)
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,  # ⭐ Django hash automatiquement
            nom=nom,
            prenom=prenom,
            telephone=telephone
        )
        
        print(f"   ✅ Utilisateur créé: {user.email} (ID: {user.id})")
        print(f"   🔐 Password hash: {user.password[:30]}...")
        
        # ⭐ CONNEXION AUTOMATIQUE APRÈS INSCRIPTION
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        
        return JsonResponse({
            "success": True,
            "message": "Compte créé avec succès",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "nom": user.nom,
                "prenom": user.prenom,
                "telephone": user.telephone
            },
            "session_id": request.session.session_key
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "error": "Données JSON invalides"
        }, status=400)
    except Exception as e:
        print(f"❌ [REGISTER] Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            "success": False,
            "error": f"Erreur serveur: {str(e)}"
        }, status=500)

# ============================================================================
# CONNEXION (SIGN IN)
# ============================================================================
# auth_service/views.py - REMPLACEZ COMPLÈTEMENT sign_in PAR CE CODE

@csrf_exempt
@require_POST
def sign_in(request):
    """Connexion RADICALE - ça MARCHE"""
    print("🚀 SIGNIN RADICAL START ===================================")
    
    try:
        # 1. DEBUG avant
        print(f"📊 AVANT - User: {request.user}, Auth: {request.user.is_authenticated}")
        print(f"🍪 Cookies reçus: {request.COOKIES}")
        
        # 2. Parser données
        import json
        data = json.loads(request.body)
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        
        print(f"📦 Email: {email}, Password len: {len(password)}")
        
        if not email or not password:
            return JsonResponse({"error": "Champs requis"}, status=400)
        
        # 3. Trouver l'utilisateur MANUELLEMENT
        from .models import User
        try:
            user = User.objects.get(email=email)
            print(f"👤 User trouvé: {user.email}, Username: {user.username}")
        except User.DoesNotExist:
            print(f"❌ User non trouvé: {email}")
            return JsonResponse({"error": "Identifiants invalides"}, status=401)
        
        # 4. Vérifier mot de passe
        if not user.check_password(password):
            print(f"❌ Mot de passe incorrect pour: {email}")
            return JsonResponse({"error": "Identifiants invalides"}, status=401)
        
        print(f"✅ Identifiants VALIDES pour: {user.email}")
        
        # 5. ⭐⭐ CRÉER LA SESSION MANUELLEMENT
        print(f"🛠️  Création session manuelle...")
        
        # A. Nettoyer toute ancienne session
        if hasattr(request, 'session') and request.session.session_key:
            print(f"🗑️  Nettoyage ancienne session: {request.session.session_key}")
            request.session.flush()
        
        # B. Créer nouvelle session
        request.session.create()
        
        # C. Sauvegarder l'utilisateur dans la session
        from django.contrib.auth import login
        user.backend = 'django.contrib.auth.backends.ModelBackend'  # Backend simple
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')

        
        # D. Forcer la sauvegarde
        request.session.save()
        
        # 6. DEBUG après
        print(f"✅ APRÈS - User: {request.user}, Auth: {request.user.is_authenticated}")
        print(f"🔑 Session key: {request.session.session_key}")
        print(f"📋 Session data: {dict(request.session)}")
        print(f"🍪 Cookies envoyés: sessionid={request.session.session_key[:10]}...")
        print("=======================================================")
        
        # 7. Réponse
        return JsonResponse({
            "success": True,
            "message": "Connexion réussie",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "nom": user.nom,
                "prenom": user.prenom,
                "telephone": user.telephone
            },
            "session_id": request.session.session_key,
            "debug": {
                "session_created": True,
                "session_key": request.session.session_key,
                "user_in_request": str(request.user)
            }
        })
        
    except Exception as e:
        print(f"💥 ERREUR FATALE: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)

# ============================================================================
# DÉCONNEXION (SIGN OUT)
# ============================================================================

@csrf_exempt
@require_POST
def sign_out(request):
    """Déconnexion utilisateur"""
    print(f"🚪 [SIGNOUT] Déconnexion pour: {request.user}")
    
    logout(request)
    
    return JsonResponse({
        "success": True,
        "message": "Déconnexion réussie"
    })

# ============================================================================
# CSRF TOKEN
# ============================================================================

@ensure_csrf_cookie
@require_GET
def csrf(request):
    """Génère et retourne un token CSRF"""
    token = get_token(request)
    
    print(f"🍪 [CSRF] Token généré: {token[:20]}...")
    
    response = JsonResponse({
        "success": True,
        "detail": "CSRF cookie set",
        "csrftoken": token
    })
    
    # Définir le cookie manuellement
    response.set_cookie(
        'csrftoken',
        token,
        max_age=3600 * 24 * 7,
        httponly=False,  # Accessible par JavaScript
        samesite='Lax',
        secure=False,    # False pour localhost
        path='/',
    )
    
    return response

# ============================================================================
# UTILISATEUR COURANT
# ============================================================================

@csrf_exempt
@require_GET
def current_user(request):
    """Retourne l'utilisateur actuellement connecté"""
    print(f"👤 [CURRENT_USER] Requête pour: {request.user}")
    
    if request.user.is_authenticated:
        return JsonResponse({
            "success": True,
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "nom": request.user.nom,
                "prenom": request.user.prenom,
                "telephone": request.user.telephone,
                "is_authenticated": True
            }
        })
    else:
        return JsonResponse({
            "success": False,
            "error": "Non authentifié",
            "user": None
        }, status=401)

# ============================================================================
# DEBUG & TEST
# ============================================================================

@csrf_exempt
def debug_user(request):
    """Endpoint de debug pour vérifier un utilisateur"""
    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip().lower()
        
        if not email:
            return JsonResponse({"error": "Email requis"}, status=400)
        
        try:
            user = User.objects.get(email=email)
            
            # Vérifier le mot de passe si fourni
            password = data.get("password", "")
            password_match = False
            if password:
                password_match = user.check_password(password)
            
            return JsonResponse({
                "found": True,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "nom": user.nom,
                    "prenom": user.prenom,
                    "date_joined": str(user.date_joined),
                },
                "password_match": password_match,
                "password_set": bool(user.password),
                "is_active": user.is_active,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
            })
            
        except User.DoesNotExist:
            return JsonResponse({
                "found": False,
                "message": f"Aucun utilisateur avec email: {email}"
            })
            
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def test(request):
    """Endpoint de test simple"""
    return JsonResponse({
        "success": True,
        "message": "Auth service is working",
        "timestamp": time.time(),
        "user": str(request.user),
        "authenticated": request.user.is_authenticated
    })