import { Tabs } from 'expo-router';
import { Bookmark, Search, Sparkles } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 8,
          height: 56,
          borderRadius: 28,
          backgroundColor: 'rgba(20,24,32,0.88)',
          borderTopColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.07)'
        },
        tabBarActiveTintColor: '#D6FF3F',
        tabBarInactiveTintColor: '#7D8491',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800' }
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Scelte', tabBarIcon: ({ color }) => <Sparkles color={color} size={22} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Scopri', tabBarIcon: ({ color }) => <Search color={color} size={22} /> }} />
      <Tabs.Screen name="favorites" options={{ title: 'Vault', tabBarIcon: ({ color }) => <Bookmark color={color} size={22} /> }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
