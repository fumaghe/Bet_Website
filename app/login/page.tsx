'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const [showForm, setShowForm] = useState(false);

  const handleButtonClick = () => {
    setShowForm(true);
  };

  return (
    <div className="relative min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Sfondo Animato */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      >
        {/* Esempio di linee animate */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="opacity-50"
        >
          <motion.line
            x1="0"
            y1="30"
            x2="100"
            y2="30"
            stroke="#00FF00" // Verde neon
            strokeWidth="1"
            animate={{ x1: [0, 100, 0], x2: [100, 0, 100] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          <motion.line
            x1="50"
            y1="0"
            x2="50"
            y2="100"
            stroke="#00FF00"
            strokeWidth="1"
            animate={{ y1: [0, 100, 0], y2: [100, 0, 100] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          {/* Aggiungi ulteriori elementi grafici animati se desideri */}
        </svg>
      </motion.div>

      {/* Contenuto Principale */}
      <motion.div
        className="z-10 w-full max-w-md space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-10 w-10 text-green-500" />
            <span className="text-3xl font-bold text-white">BetScore</span>
          </div>
          <p className="text-gray-400">
            Accedi per visualizzare statistiche e predizioni
          </p>
        </div>

        {/* Pulsante Centrale e Form di Login */}
        <Card className="p-6 bg-darkblue bg-opacity-90">
          <AnimatePresence>
            {!showForm ? (
              <motion.button
                key="login-button"
                className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white text-lg font-semibold rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ duration: 0.5 }}
                onClick={handleButtonClick}
              >
                Entra nel mondo delle statistiche
              </motion.button>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
              >
                <LoginForm />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Elementi Grafici Aggiuntivi (Opzionale) */}
      <motion.div
        className="absolute bottom-10 left-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 3, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      >
        {/* Puoi aggiungere ulteriori SVG o elementi grafici animati */}
      </motion.div>
    </div>
  );
}
