// src/services/api.js

// 🔹 Base URL pour Django
const API_BASE_URL = 'http://localhost:8000';

// 🔹 Fonction utilitaire pour extraire le cookie CSRF
const getCSRFTokenFromCookie = () => {
  const cookieMatch = document.cookie.match(/csrftoken=([^;]+)/);
  return cookieMatch ? cookieMatch[1] : null;
};

// 🔹 Récupère et gère le token CSRF
export const getCSRFToken = () => {
  // 1. Essayer depuis les cookies (source de vérité)
  const tokenFromCookie = getCSRFTokenFromCookie();
  
  if (tokenFromCookie) {
    // Synchroniser avec localStorage pour une récupération plus rapide
    const storedToken = localStorage.getItem('csrftoken');
    if (storedToken !== tokenFromCookie) {
      localStorage.setItem('csrftoken', tokenFromCookie);
    }
    return tokenFromCookie;
  }
  
  // 2. Fallback vers localStorage (si cookie manquant mais localStorage présent)
  const tokenFromStorage = localStorage.getItem('csrftoken');
  if (tokenFromStorage) {
    console.warn("⚠️ CSRF token récupéré depuis localStorage - les cookies peuvent être désactivés");
    return tokenFromStorage;
  }
  
  return null;
};

// 🔹 Obtenir un nouveau token CSRF depuis Django
export const fetchCSRFToken = async () => {
  try {
    // Cette endpoint doit utiliser @ensure_csrf_cookie dans Django
    const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
      method: 'GET',
      credentials: 'include', // Important pour recevoir les cookies
    });
    
    if (!response.ok) {
      throw new Error(`CSRF fetch failed: ${response.status}`);
    }
    
    // Django devrait maintenant nous envoyer le cookie 'csrftoken' automatiquement
    // Nous ne créons plus de cookie manuellement
    
    // Extraire le token du cookie
    const csrfToken = getCSRFTokenFromCookie();
    
    if (csrfToken) {
      localStorage.setItem('csrftoken', csrfToken);
      console.log("✅ Token CSRF obtenu depuis Django et stocké");
      return csrfToken;
    }
    
    console.warn("⚠️ Aucun token CSRF reçu dans les cookies");
    return null;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du token CSRF:", error);
    throw error;
  }
};

// 🔹 Headers communs pour toutes les requêtes
const getCommonHeaders = () => {
  return {
    'Content-Type': 'application/json',
    // Pas d'Authorization header par défaut - utilisation de sessions Django
  };
};

// 🔹 Service général pour les requêtes API
export const apiService = {
  async get(url, options = {}) {
    const headers = getCommonHeaders();
    
    // Ajouter le token CSRF pour les GET si nécessaire
    // Note: Certains endpoints Django peuvent nécessiter CSRF même pour GET
    const csrfToken = getCSRFToken();
    console.log(csrfToken);
    if (csrfToken && options.requireCSRF !== false) {
      headers['X-CSRFToken'] = csrfToken;
    }
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      credentials: 'include', // ESSENTIEL pour les sessions Django
      headers,
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      throw errorData;
    }
    
    return await response.json();
  },

  async post(url, data = {}, options = {}) {
    const headers = getCommonHeaders();
    
    // TOUJOURS ajouter CSRF pour les méthodes "unsafe" (POST, PUT, DELETE, PATCH)
    const csrfToken = getCSRFToken();
    if (!csrfToken) {
      throw new Error('CSRF token manquant pour une requête POST');
    }
    
    headers['X-CSRFToken'] = csrfToken;
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      credentials: 'include', // ESSENTIEL pour les sessions Django
      headers,
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      throw errorData;
    }
    
    return await response.json();
  },

  async put(url, data = {}, options = {}) {
    const headers = getCommonHeaders();
    
    const csrfToken = getCSRFToken();
    if (!csrfToken) {
      throw new Error('CSRF token manquant pour une requête PUT');
    }
    
    headers['X-CSRFToken'] = csrfToken;
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      throw errorData;
    }
    
    return await response.json();
  },

  async delete(url, options = {}) {
    const headers = getCommonHeaders();
    
    const csrfToken = getCSRFToken();
    if (!csrfToken) {
      throw new Error('CSRF token manquant pour une requête DELETE');
    }
    
    headers['X-CSRFToken'] = csrfToken;
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      throw errorData;
    }
    
    return await response.json();
  },
};

// 🔹 Fonction utilitaire pour parser les erreurs de manière cohérente
async function parseErrorResponse(response) {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      return {
        status: response.status,
        statusText: response.statusText,
        message: errorData.error || errorData.detail || errorData.message || 'Une erreur est survenue',
        data: errorData,
      };
    } else {
      const errorText = await response.text();
      return {
        status: response.status,
        statusText: response.statusText,
        message: errorText || `Erreur ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      status: response.status,
      statusText: response.statusText,
      message: `Erreur ${response.status}: ${response.statusText}`,
    };
  }
}

// 🔹 API spécifique pour l'authentification
export const authAPI = {
  // Initialiser le token CSRF (à appeler avant toute interaction)
  async initCSRF() {
    return await fetchCSRFToken();
  },

  // Connexion utilisant l'authentification par session Django
  async login(email, password) {
    try {
      const response = await apiService.post('/auth/signin/', {
        email: email.toLowerCase().trim(),
        password,
      });
      
      return {
        success: true,
        data: response,
        status: 200,
      };
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return {
        success: false,
        error: error.message || 'Échec de la connexion',
        status: error.status || 500,
      };
    }
  },

  // Inscription
  async register(userData) {
    try {
      const response = await apiService.post('/auth/register/', userData);
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      return {
        success: false,
        error: error.message || 'Échec de l\'inscription',
      };
    }
  },

  // Vérifier l'utilisateur actuel (utilise la session Django)
  async getCurrentUser() {
    try {
      // Pas besoin de token JWT - la session Django est utilisée
      const response = await apiService.get('/auth/user/', {
        requireCSRF: true, // Certains endpoints peuvent nécessiter CSRF même en GET
      });
      
      return {
        success: true,
        user: response,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return {
        success: false,
        error: error.message,
        status: error.status,
      };
    }
  },

  // Déconnexion
  async logout() {
    try {
      // Appeler l'endpoint de déconnexion Django
      await apiService.post('/auth/logout/', {});
      
      // Nettoyer le stockage local
      localStorage.removeItem('csrftoken');
      
      console.log("✅ Déconnexion effectuée avec succès");
      return { success: true };
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // Nettoyer quand même le stockage local en cas d'erreur
      localStorage.removeItem('csrftoken');
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// 🔹 API spécifique pour les comptes
export const accountAPI = {
  async getBalance() {
    try {
      // Utilise la session Django pour l'authentification
      // requireCSRF: false car Django ne requiert généralement pas CSRF pour les GET
      const response = await apiService.get('/account/balance/', {
        requireCSRF: true,
      });
      
      return {
        success: true,
        balance: response.balance,
        currency: response.currency,
        data: response,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      return {
        success: false,
        error: error.message,
        status: error.status,
      };
    }
  },

  async getTransactions(page = 1, limit = 10) {
    try {
      const response = await apiService.get(`/account/transactions/?page=${page}&limit=${limit}`, {
        requireCSRF: false,
      });
      
      return {
        success: true,
        transactions: response.transactions,
        pagination: response.pagination,
        data: response,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      return {
        success: false,
        error: error.message,
        status: error.status,
      };
    }
  },
  // Dans services/api.js - modifiez accountAPI.getTransactions
async getTransactions(page = 1, limit = 10) {
  try {
    console.log('🔍 Appel API getTransactions...');
    
    // Utiliser le nouvel endpoint /transfer/transactions/
    const response = await apiService.get(`/transfer/transactions/?page=${page}&limit=${limit}`, {
      requireCSRF: true,
    });
    
    console.log('📊 Réponse transactions:', response);
    
    if (response && response.success !== false) {
      return {
        success: true,
        transactions: response.transactions || [], // Note: 'transactions' et non 'transfers'
        pagination: response.pagination || { page, limit, total: response.transactions?.length || 0 },
        data: response,
      };
    }
    
    return {
      success: false,
      error: response.error || 'Structure de réponse inattendue',
      transactions: [],
      data: response,
    };
    
  } catch (error) {
    console.error('❌ Erreur getTransactions:', error);
    return {
      success: false,
      error: error.message || 'Erreur de connexion',
      transactions: [],
    };
  }
},
}
  // services/api.js - Ajoutez ces méthodes

// 🔹 Configuration Côte Django
/*
Dans votre configuration Django, assurez-vous d'avoir :

1. Middleware CSRF activé :
   MIDDLEWARE = [
     'django.middleware.csrf.CsrfViewMiddleware',
     ...
   ]

2. CORS configuré correctement :
   CORS_ALLOW_CREDENTIALS = True
   CORS_ALLOWED_ORIGINS = [
     "http://localhost:3000",
     "http://127.0.0.1:3000",
   ]

3. Sessions activées et configurées

4. Endpoint CSRF avec @ensure_csrf_cookie :
   from django.views.decorators.csrf import ensure_csrf_cookie
   
   @ensure_csrf_cookie
   def get_csrf_token(request):
       return JsonResponse({'detail': 'CSRF cookie set'})
*/

// 🔹 Hook React personnalisé (optionnel - pour une intégration plus poussée)
export const useCSRF = () => {
  const [csrfToken, setCsrfToken] = useState(null);
  
  useEffect(() => {
    const initCSRF = async () => {
      try {
        const token = await fetchCSRFToken();
        setCsrfToken(token);
      } catch (error) {
        console.error('Échec de l\'initialisation CSRF:', error);
      }
    };
    
    initCSRF();
  }, []);
  
  return csrfToken;
};

// 🔹 Initialisation automatique au chargement (optionnel)
// Vous pouvez appeler cette fonction dans votre composant App ou Login
export const initializeApp = async () => {
  try {
    // Essayer de récupérer le token CSRF existant
    let token = getCSRFToken();
    
    if (!token) {
      console.log('🔐 Initialisation du token CSRF...');
      token = await fetchCSRFToken();
    }
    
    return {
      success: true,
      csrfToken: token,
    };
  } catch (error) {
    console.error('Échec de l\'initialisation de l\'application:', error);
    return {
      success: false,
      error: error.message,
    };
  }
  

};
export const transferAPI = {
  async makeTransfer(transferData) {
    try {
      const response = await apiService.post('/transfer/', transferData);
      return response;
    } catch (error) {
      console.error('Erreur virement:', error);
      return {
        success: false,
        error: error.message,
        status: error.status,
      };
    }
  },

  async getTransferHistory(page = 1, limit = 10) {
    try {
      const response = await apiService.get(`/transfer/history/?page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Erreur historique:', error);
      return {
        success: false,
        error: error.message,
        status: error.status,
      };
    }
  },

  async getTransferDetails(transferId) {
    try {
      const response = await apiService.get(`/transfer/history/${transferId}/`);
      return response;
    } catch (error) {
      console.error('Erreur détails:', error);
      return {
        success: false,
        error: error.message,
        status: error.status,
      };
    }
  },
  
  async getAccountDetails() {
    try {
      const response = await apiService.get('/account/details/', {
        requireCSRF: false,
      });
      
      return {
        success: true,
        details: response,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du compte:', error);
      return {
        success: false,
        error: error.message,
        status: error.status,
      };
    }
  },
};

// Ajoutez transactionAPI à l'export par défaut
export default {
  apiService,
  authAPI,
  accountAPI,

  getCSRFToken,
  fetchCSRFToken,
  initializeApp,
  transferAPI,
};