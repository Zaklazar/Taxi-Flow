import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Text,
  TextInput
} from 'react-native';

interface KeyboardFormProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  colors: any;
}

export const KeyboardForm: React.FC<KeyboardFormProps> = ({ 
  children, 
  onClose, 
  title,
  colors 
}) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end'}}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{flex: 1, justifyContent: 'flex-end'}}
        >
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '90%'
          }}>
            {/* Header */}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{color: colors.textMain, fontSize: 20, fontWeight: 'bold'}}>
                {title}
              </Text>
              <TouchableWithoutFeedback onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}>
                <Text style={{color: colors.textSub, fontSize: 24}}>×</Text>
              </TouchableWithoutFeedback>
            </View>

            {/* Contenu scrollable */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{paddingBottom: 40}}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

// Helper pour les TextInput avec fermeture clavier
export const FormInput = ({ style, ...props }) => (
  <TextInput
    style={[{
      backgroundColor: '#333',
      borderRadius: 12,
      padding: 16,
      color: '#FFF',
      fontSize: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#3F3F46'
    }, style]}
    placeholderTextColor="#666"
    returnKeyType="done"
    onSubmitEditing={Keyboard.dismiss}
    blurOnSubmit={true}
    {...props}
  />
);

export default KeyboardForm;
