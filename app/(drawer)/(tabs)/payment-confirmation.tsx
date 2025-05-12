import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  SafeAreaView 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'success' | 'failed' | 'unknown'>('unknown');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (params?.status === 'success' || params?.status === 'failed') {
      setStatus(params.status as 'success' | 'failed');
      
      // Reconstituer les données de paiement à partir des paramètres
      const data = {
        parentId: params.parentId,
        adherentId: params.adherentId,
        sessionId: params.sessionId,
        reservationId: params.reservationId,
        activiteId: params.activiteId,
        moisPaiement: params.moisPaiement,
        paymentPeriodType: params.paymentPeriodType,
        fullName: `${params.firstName || ''} ${params.lastName || ''}`.trim(),
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phoneNumber: params.phoneNumber,
        address: params.address,
        isMember: params.isMember,
        total: params.total,
        description: params.description,
        sessionDate: params.sessionDate,
      };
      
      setPaymentData(data);
    } else {
      setStatus('unknown');
    }
  }, [params]);

  const generateReceipt = async () => {
    try {
      setIsLoading(true);
      const logoUrl = 'https://your-server.com/logo.png'; // Remplacer par le vrai logo

      // Formatage de la date au format jour/mois/année
      const today = new Date();
      const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      
      // Formatage du montant avec 3 décimales
      const formattedAmount = parseFloat(Array.isArray(params?.total) ? params.total[0] : params?.total || '0').toFixed(3);

      // Informations de l'activité basées sur le type de paiement
      let activityInfo = '';
      if (params?.paymentPeriodType === 'SESSION') {
        activityInfo = `Session du ${params?.sessionDate || 'N/A'}`;
      } else if (params?.paymentPeriodType === 'MONTHLY') {
        activityInfo = `Mensualité - ${params?.moisPaiement || 'N/A'}`;
      }

    const html = `
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      @media print {
        body {
          margin: 0;
        }
      }
      body {
        font-family: Arial, sans-serif;
        padding: 40px;
        max-width: 750px;
        margin: auto;
        color: #333;
        background-color: #fff;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .logo {
        width: 100px;
        margin-bottom: 10px;
      }
      h1 {
        color: #16A34A;
        font-size: 22px;
        margin-bottom: 10px;
      }
      .receipt-section {
        margin: 30px 0;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .label {
        font-weight: bold;
        color: #374151;
      }
      .value {
        color: #111827;
      }
      .footer {
        text-align: center;
        margin-top: 40px;
        font-style: italic;
        font-size: 13px;
        color: #888;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="${logoUrl}" class="logo" />
      <h1>Reçu de Paiement</h1>
    </div>

    <div class="receipt-section">
      <div class="row"><span class="label">Date :</span><span class="value">${formattedDate}</span></div>
      <div class="row"><span class="label">Référence :</span><span class="value">#PAY-${Date.now().toString().slice(-6)}</span></div>
      <div class="row"><span class="label">Nom :</span><span class="value">${params?.firstName || ''} ${params?.lastName || ''}</span></div>
      <div class="row"><span class="label">Email :</span><span class="value">${params?.email || '-'}</span></div>
      <div class="row"><span class="label">Téléphone :</span><span class="value">${params?.phoneNumber || '-'}</span></div>
      <div class="row"><span class="label">Activité :</span><span class="value">${activityInfo}</span></div>
      <div class="row"><span class="label">Type :</span><span class="value">${params?.paymentPeriodType === 'SESSION' ? 'Par séance' : 'Mensuel'}</span></div>
      <div class="row"><span class="label">Montant :</span><span class="value">${formattedAmount} TND</span></div>
      <div class="row"><span class="label">Statut :</span><span class="value" style="color: #16A34A; font-weight: bold;">Payé</span></div>
      <div class="row"><span class="label">ID Réservation :</span><span class="value">${params?.reservationId || '-'}</span></div>
    </div>

    <div class="footer">
      Merci pour votre confiance. Ce reçu est généré automatiquement.
    </div>
  </body>
</html>
`;


      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } catch (error) {
      console.error('Erreur lors de la génération du reçu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
    router.replace('/(drawer)/ParentDashboardScreen');
  };

  const renderPaymentDetails = () => {
    if (!paymentData) return null;
    
    return (
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Détails du paiement</Text>
        
        {paymentData.paymentPeriodType && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>
              {paymentData.paymentPeriodType === 'SESSION' ? 'Session' : 'Mensuel'}
            </Text>
          </View>
        )}
        
        {paymentData.sessionDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{paymentData.sessionDate}</Text>
          </View>
        )}
        
        {paymentData.moisPaiement && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Période:</Text>
            <Text style={styles.detailValue}>{paymentData.moisPaiement}</Text>
          </View>
        )}
        
        {paymentData.total && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Montant:</Text>
            <Text style={styles.detailValue}>{parseFloat(paymentData.total).toFixed(3)} TND</Text>
          </View>
        )}
        
        {paymentData.reservationId && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Réf:</Text>
            <Text style={styles.detailValue}>#R{paymentData.reservationId}</Text>
          </View>
        )}
      </View>
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {status === 'success' ? (
          <View style={styles.centered}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
            </View>
            <Text style={styles.successText}>Paiement réussi !</Text>
            <Text style={styles.text}>Votre réservation a été confirmée.</Text>

            <Image
              source={require('C:/Users/lenovo/Desktop/chellymobil-fresh/assets/images/confirmation.png')}
              style={styles.image}
              resizeMode="contain"
            />

            {renderPaymentDetails()}

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={generateReceipt}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color="white" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Télécharger le reçu</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleGoHome}
              >
                <Ionicons name="home-outline" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Retour à l'accueil</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : status === 'failed' ? (
          <View style={styles.centered}>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>
            <Text style={styles.errorText}>Paiement échoué</Text>
            <Text style={styles.text}>
              Une erreur est survenue lors du traitement de votre paiement.
              Veuillez réessayer ou utiliser un autre moyen de paiement.
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleGoHome}
            >
              <Ionicons name="home-outline" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Retour à l'accueil</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <Text style={styles.text}>Vérification du paiement...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  iconContainer: {
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: '#4B5563',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  successText: {
    fontSize: 24,
    color: '#22C55E',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 24,
    color: '#EF4444',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    marginTop: 30,
    gap: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  primaryButton: {
    backgroundColor: '#10B981',
  },
  secondaryButton: {
    backgroundColor: '#6B46C1',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  image: {
    width: 200,
    height: 200,
    marginVertical: 24,
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  }
});