from django.db import models
from django.contrib.auth.models import AbstractUser
import random
from django.db.models.signals import post_save
from django.dispatch import receiver
from account_service.models import Account

class User(AbstractUser):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telephone = models.CharField(max_length=20, unique=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom', 'prenom', 'telephone', 'username']

    def save(self, *args, **kwargs):
        if not self.username and self.email:
            self.username = self.email.split('@')[0]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.prenom} {self.nom})"


# Automatically create an Account when a new user is created
@receiver(post_save, sender=User)
def create_account_for_user(sender, instance, created, **kwargs):
    if created:
        Account.objects.create(user=instance)
