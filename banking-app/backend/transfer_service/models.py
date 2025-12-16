# transfer_service/models.py
from django.db import models
from django.contrib.auth import get_user_model
from account_service.models import Account
import uuid
from django.utils import timezone

User = get_user_model()

class Transfer(models.Model):
    TRANSFER_STATUS = (
        ('pending', 'En attente'),
        ('completed', 'Complété'),
        ('failed', 'Échoué'),
        ('cancelled', 'Annulé'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sent_transfers')
    recipient_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='received_transfers')
    recipient_rib = models.CharField(max_length=34)  # RIB du bénéficiaire
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='TND')
    description = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=TRANSFER_STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    reference = models.CharField(max_length=50, unique=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['recipient_rib']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.reference} - {self.amount}€"
    
    def save(self, *args, **kwargs):
        if not self.reference:
            # Générer une référence unique : VIR-YYYYMMDD-XXXXXX
            date_str = timezone.now().strftime('%Y%m%d')
            random_str = str(uuid.uuid4().int)[:6]
            self.reference = f"VIR-{date_str}-{random_str}"
        super().save(*args, **kwargs)


class TransferHistory(models.Model):
    transfer = models.ForeignKey(Transfer, on_delete=models.CASCADE, related_name='history')
    status = models.CharField(max_length=20)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.transfer.reference} - {self.status}"