import { ScrollView, Text } from 'react-native';
import { Card, Segmented, useAppTheme } from '../lib/ui';

const MODES = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']];

export default function Settings() {
  const { s, mode, setMode } = useAppTheme();
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.list}>
      <Card>
        <Text style={s.title}>Appearance</Text>
        <Segmented options={MODES} value={mode} onChange={setMode} />
        <Text style={s.muted}>System follows your phone's light or dark setting.</Text>
      </Card>
    </ScrollView>
  );
}
