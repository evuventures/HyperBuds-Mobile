import { useRouter } from 'expo-router'; // ← Import this
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter(); // ← Initialize the router

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to HyperBuds!</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/login')} // ← Navigate to login
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/signup')}
          style={styles.button}>
          <Text style={styles.buttonText}>Signup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    backgroundColor: '#6A0DAD',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
