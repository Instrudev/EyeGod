import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '@hooks/useAuth';

type RoleOption = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
};

const roles: RoleOption[] = [
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Gestiona módulos y usuarios',
    icon: 'shield-checkmark-outline',
    color: '#38bdf8',
  },
  {
    id: 'lider',
    label: 'Líder',
    description: 'Coordina rutas y equipos',
    icon: 'people-circle-outline',
    color: '#22c55e',
  },
  {
    id: 'colaborador',
    label: 'Colaborador',
    description: 'Registra encuestas y avances',
    icon: 'clipboard-outline',
    color: '#facc15',
  },
];

const LoginScreen: React.FC = () => {
  const { signIn, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);

  const handleLogin = async () => {
    if (!selectedRole) {
      Alert.alert('Selecciona un rol', 'Debes elegir un rol para continuar.');
      return;
    }

    try {
      await signIn({ email, password, role: selectedRole.id });
    } catch {
      Alert.alert('Error', 'No se pudo iniciar sesión. Verifica tus credenciales.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <View style={[styles.content, selectedRole && styles.contentWithForm]}>
        <Text style={styles.brand}>InfinityGo</Text>
        <Text style={styles.subtitle}>Selecciona tu rol para ingresar</Text>

        <View style={styles.rolesWrapper}>
          {roles.map((role) => {
            const isSelected = selectedRole?.id === role.id;
            return (
              <Pressable
                key={role.id}
                style={[styles.roleCard, { borderColor: isSelected ? role.color : '#334155' }, isSelected && styles.roleSelected]}
                android_ripple={{ color: '#1f2937' }}
                onPress={() => setSelectedRole(role)}
              >
                <View style={[styles.iconBadge, { backgroundColor: `${role.color}26` }]}>
                  <MaterialCommunityIcons name={role.icon} size={28} color={role.color} />
                </View>
                <View style={styles.roleTextWrapper}>
                  <Text style={styles.roleTitle}>{role.label}</Text>
                  <Text style={styles.roleDescription}>{role.description}</Text>
                </View>
                {isSelected ? <MaterialIcons name="check-circle" size={22} color={role.color} /> : <View style={styles.placeholderDot} />}
              </Pressable>
            );
          })}
        </View>

        {selectedRole && (
          <View style={styles.form}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Accede como {selectedRole.label}</Text>
              <Text style={styles.formHint}>Ingresa tus credenciales para continuar.</Text>
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
        )}
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
  contentWithForm: {
    justifyContent: 'flex-start',
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
  rolesWrapper: {
    gap: 12,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  roleSelected: {
    backgroundColor: '#0f172a',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextWrapper: {
    flex: 1,
  },
  roleTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  roleDescription: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  placeholderDot: {
    width: 22,
    height: 22,
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
