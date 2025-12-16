from django.db import models
from django.conf import settings
import random

User = settings.AUTH_USER_MODEL  # 'auth_service.User'

class Account(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="account")
    rib = models.CharField(max_length=34, unique=True, blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=5, default="DT")
    created_at = models.DateTimeField(auto_now_add=True)

    def generate_rib(self):
        while True:
            rib_number = "TN" + "".join(str(random.randint(0, 9)) for _ in range(22))
            if not Account.objects.filter(rib=rib_number).exists():
                return rib_number

    def save(self, *args, **kwargs):
        if not self.rib:
            self.rib = self.generate_rib()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Compte de {self.user.email}"
