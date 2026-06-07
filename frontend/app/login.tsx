import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Mail, Sparkles } from 'lucide-react-native';
import { api, saveToken } from '@/services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(true);

  async function submit(mode: 'login' | 'register') {
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email, password } : { email, password, username: email.split('@')[0] };
      let data;
      try {
        const response = await api.post(endpoint, payload);
        data = response.data;
      } catch (error) {
        if (mode !== 'register') throw error;
        const response = await api.post('/auth/login', { email, password });
        data = response.data;
      }
      if (data.access_token) {
        await saveToken(data.access_token);
        router.replace('/onboarding');
      } else {
        Alert.alert('Controlla la mail', 'Account creato. Conferma la mail Supabase, poi accedi.');
      }
    } catch (error) {
      Alert.alert('Accesso non riuscito', 'Controlla le credenziali o crea un account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.glow} />
      <View style={styles.shell}>
        <View style={styles.top}>
          <View style={styles.logoMark}>
            <Sparkles color="#D6FF3F" size={18} />
          </View>
          <Text style={styles.logo}>GAAS</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>La prossima scelta inizia qui.</Text>
          <Text style={styles.copy}>Il tuo profilo aiuta GAAS a ridurre lo scrolling infinito e consigliarti solo cio che ti rappresenta.</Text>
        </View>

        <View style={styles.panel}>
          <Pressable style={[styles.authButton, showEmail && styles.authButtonActive]} onPress={() => setShowEmail((value) => !value)}>
            <View style={styles.authIcon}><Mail color="#D6FF3F" size={17} /></View>
            <Text style={styles.authText}>Accedi con email Supabase</Text>
          </Pressable>

          {showEmail && (
            <View style={styles.emailBox}>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor="#7D8491" />
              <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#7D8491" />
              <Pressable style={styles.primary} onPress={() => submit('login')} disabled={loading}>
                {loading ? <ActivityIndicator color="#0F1115" /> : <Text style={styles.primaryText}>Accedi</Text>}
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => submit('register')} disabled={loading}>
                <Text style={styles.secondaryText}>Crea account</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.footer}>Privacy by design. I tuoi segnali servono solo a costruire scelte migliori.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115', padding: 22, justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', top: -120, right: -120, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(214,255,63,0.08)' },
  shell: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 22 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(214,255,63,0.10)', borderWidth: 1, borderColor: 'rgba(214,255,63,0.22)' },
  logo: { color: '#F5F5F5', fontSize: 16, fontWeight: '900' },
  hero: { gap: 10 },
  title: { color: '#F5F5F5', fontSize: 40, lineHeight: 44, fontWeight: '900', letterSpacing: 0 },
  copy: { color: '#B8BCC6', fontSize: 15, lineHeight: 22, fontWeight: '700' },
  panel: { gap: 10, padding: 12, borderRadius: 22, backgroundColor: 'rgba(24,28,36,0.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  authButton: { minHeight: 54, borderRadius: 27, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(29,34,43,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  authButtonActive: { borderColor: 'rgba(214,255,63,0.24)' },
  authIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,17,21,0.66)' },
  googleText: { color: '#F5F5F5', fontSize: 16, fontWeight: '900' },
  authText: { color: '#F5F5F5', fontSize: 14, fontWeight: '900' },
  emailBox: { gap: 9, paddingTop: 4 },
  input: { color: '#F5F5F5', height: 52, borderRadius: 16, paddingHorizontal: 15, backgroundColor: '#141820', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', fontWeight: '800' },
  primary: { height: 54, borderRadius: 27, backgroundColor: '#D6FF3F', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#0F1115', fontWeight: '900', fontSize: 15 },
  secondary: { height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#F5F5F5', fontWeight: '900' },
  footer: { color: '#7D8491', fontSize: 12, lineHeight: 17, textAlign: 'center', fontWeight: '700' }
});
