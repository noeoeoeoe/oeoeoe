import { createContext, useContext, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SignIn } from '@/components/sign-in';

type AccountControls = { open: () => void };

const AccountContext = createContext<AccountControls>({ open: () => {} });

/** Lets any screen open the account / sign-in sheet (e.g. to link an email). */
export function useAccount() {
  return useContext(AccountContext);
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  return (
    <AccountContext.Provider value={{ open: () => setVisible(true) }}>
      {children}
      {visible && (
        <View style={StyleSheet.absoluteFill}>
          <SignIn onClose={() => setVisible(false)} />
        </View>
      )}
    </AccountContext.Provider>
  );
}
