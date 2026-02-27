import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { QueueScreen } from '../screens/QueueScreen';
import { MiniPlayer } from '../components/MiniPlayer';
import { COLORS } from '../theme/colors';

export type RootStackParamList = {
  Home: undefined;
  Player: undefined;
  Queue: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.bgSecondary,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.primary,
    notification: COLORS.accent,
  },
};

// HomeWithMiniPlayer wraps HomeScreen + MiniPlayer in one root view
function HomeWithMiniPlayer({ navigation }: any) {
  return (
    <View style={styles.container}>
      <HomeScreen navigation={navigation} />
      <MiniPlayer />
    </View>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={NavTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false, cardStyle: { backgroundColor: COLORS.bg } }}
      >
        <Stack.Screen name="Home" component={HomeWithMiniPlayer} />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{
            presentation: 'modal',
            gestureEnabled: true,
            cardOverlayEnabled: true,
            cardStyle: { backgroundColor: COLORS.bg },
          }}
        />
        <Stack.Screen
          name="Queue"
          component={QueueScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
});
