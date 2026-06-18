import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Errands</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="gym">
        <NativeTabs.Trigger.Label>Gym</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.run" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="meals">
        <NativeTabs.Trigger.Label>Meals</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="recipes">
        <NativeTabs.Trigger.Label>Recipes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="weight">
        <NativeTabs.Trigger.Label>Weight</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="scalemass" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
