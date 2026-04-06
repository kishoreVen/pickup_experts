'use client';
import { useState, useEffect } from 'react';

export function useSettings() {
  const [apiKey, setApiKeyState] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('pickup_experts_apikey');
    if (stored) setApiKeyState(stored);
  }, []);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    if (key) localStorage.setItem('pickup_experts_apikey', key);
    else localStorage.removeItem('pickup_experts_apikey');
  };

  return { apiKey, setApiKey };
}
