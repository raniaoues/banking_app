// context/AuthContext.js - VERSION CORRIGÉE
import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("🔍 Vérification de l'authentification...");
        
        // Test 1: Vérifier avec l'endpoint debug
        const debugResponse = await fetch('http://127.0.0.1:8000/account/debug/', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log("Debug auth data:", debugData);
          
          if (debugData.authenticated) {
            // Utilisateur authentifié
            const savedUser = localStorage.getItem("user");
            if (savedUser) {
              const userData = JSON.parse(savedUser);
              setUser(userData);
              setIsAuthenticated(true);
            } else {
              // Récupérer les infos utilisateur
              const userResult = await authAPI.getCurrentUser();
              if (userResult.success) {
                setUser(userResult.user);
                setIsAuthenticated(true);
                localStorage.setItem("user", JSON.stringify(userResult.user));
              }
            }
          }
        }
      } catch (error) {
        console.error("Erreur vérification auth:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const loginUser = async (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("user", JSON.stringify(userData));
    
    // Vérifier immédiatement l'authentification
    setTimeout(async () => {
      try {
        const debugResponse = await fetch('http://127.0.0.1:8000/account/debug/', {
          method: 'GET',
          credentials: 'include',
        });
        const debugData = await debugResponse.json();
        console.log("Post-login debug:", debugData);
      } catch (error) {
        console.error("Post-login check error:", error);
      }
    }, 100);
  };

  const logoutUser = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("user");
      localStorage.removeItem("csrftoken");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated,
      loginUser, 
      logoutUser,
      demoMode: false 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);