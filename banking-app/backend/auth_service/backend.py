# auth_service/backends.py - CRÉEZ CE FICHIER
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailAuthBackend(ModelBackend):
    """Backend pour User avec USERNAME_FIELD='email'"""
    
    def authenticate(self, request, **credentials):
        # Avec USERNAME_FIELD='email', on doit chercher par email
        email = credentials.get('email') or credentials.get('username')
        password = credentials.get('password')
        
        if not email or not password:
            return None
        
        try:
            # Chercher par email (USERNAME_FIELD)
            user = User.objects.get(email=email)
            
            # Vérifier le mot de passe
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
                
        except User.DoesNotExist:
            # Fallback: chercher par username (au cas où)
            try:
                user = User.objects.get(username=email)
                if user.check_password(password) and self.user_can_authenticate(user):
                    return user
            except User.DoesNotExist:
                return None
        
        return None
    
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None