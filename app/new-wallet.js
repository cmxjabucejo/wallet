import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useWallets } from '../lib/store';
import { WalletForm } from '../lib/forms';
import { Card, useAppTheme } from '../lib/ui';

export default function NewWallet() {
  const { addWallet } = useWallets();
  const { s } = useAppTheme();
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
      <Card>
        <WalletForm submitLabel="Create wallet" onSubmit={(p) => { addWallet(p); router.back(); }} />
      </Card>
    </ScrollView>
  );
}
