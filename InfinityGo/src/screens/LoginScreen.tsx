import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@hooks/useAuth';

const LoginScreen: React.FC = () => {
  const { signIn, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await signIn({ email, password });
    } catch {
      Alert.alert('Error', 'No se pudo iniciar sesión. Verifica tus credenciales.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.brand}>InfinityGo</Text>
        <Text style={styles.subtitle}>Ingresa con tu correo y contraseña.</Text>

        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Inicio de sesión</Text>
            <Text style={styles.formHint}>El sistema detecta tu rol automáticamente.</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#cbd5e1"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#cbd5e1"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    marginTop: 26,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 20,
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  formHeader: {
    gap: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  formHint: {
    color: '#94a3b8',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#1f2937',
    color: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3a4f',
  },
  button: {
    marginTop: 4,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#0b1220',
    fontWeight: '800',
    fontSize: 16,
  },
  error: {
    color: '#f87171',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default LoginScreen;
