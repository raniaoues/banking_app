# auth_service/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('signin/', views.sign_in, name='signin'),
    path('signout/', views.sign_out, name='signout'),
    path('csrf/', views.csrf, name='csrf'),
    path('current-user/', views.current_user, name='current-user'),
    path('debug-user/', views.debug_user, name='debug-user'),
    path('test/', views.test, name='test'),
]