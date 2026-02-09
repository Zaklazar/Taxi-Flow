// Placeholder pour l'URL de l'agent Blink (à configurer plus tard)
const BLINK_AGENT_URL = process.env.EXPO_PUBLIC_BLINK_AGENT_URL || '';

export interface DTCInterpretation {
  code: string;
  severity: 'critique' | 'majeur' | 'mineur';
  description: string;
  explication: string;
  impactConformite: string;
  recommandation: string;
}

export interface OBD2InterpretationResult {
  success: boolean;
  interpretations?: DTCInterpretation[];
  statutVehicule: 'conforme' | 'non-conforme' | 'attention';
  messageGlobal: string;
  error?: string;
}

export class OBD2InterpretationService {
  /**
   * Interpréter les codes DTC avec l'IA (Agent Blink)
   * TODO: Connecter à l'agent Blink une fois l'URL fournie
   * 
   * Pour le moment, retourne simplement les codes bruts sans interprétation
   */
  static async interpretDTCCodes(dtcCodes: string[]): Promise<OBD2InterpretationResult> {
    if (dtcCodes.length === 0) {
      return {
        success: true,
        interpretations: [],
        statutVehicule: 'conforme',
        messageGlobal: '✅ Aucun code d\'erreur détecté.'
      };
    }

    // Pour le moment, retourner les codes bruts sans interprétation IA
    console.log('📋 Codes DTC détectés (bruts):', dtcCodes);

    return {
      success: true,
      interpretations: dtcCodes.map(code => ({
        code,
        severity: 'mineur',
        description: 'Code détecté (interprétation non disponible)',
        explication: 'En attente de connexion à l\'agent Blink',
        impactConformite: 'À déterminer',
        recommandation: 'Consulter un mécanicien pour interpréter le code'
      })),
      statutVehicule: 'attention',
      messageGlobal: `📋 ${dtcCodes.length} code(s) d'erreur détecté(s): ${dtcCodes.join(', ')}`
    };
  }

  /**
   * PLACEHOLDER - Fonction vide pour future intégration Agent Blink
   * 
   * Cette fonction sera connectée à votre agent Blink plus tard.
   * Elle enverra les codes DTC à l'agent et recevra l'interprétation en français québécois
   * selon le Règlement T-11.2, r. 4
   * 
   * @param dtcCodes - Liste des codes DTC à interpréter (ex: ["P0420", "P0300"])
   * @returns Interprétation détaillée de chaque code
   */
  static async interpretDTCWithAI(dtcCodes: string[]): Promise<OBD2InterpretationResult> {
    // TODO: Implémenter appel à l'agent Blink
    // URL sera fournie dans EXPO_PUBLIC_BLINK_AGENT_URL
    
    if (!BLINK_AGENT_URL) {
      console.log('⚠️ URL Agent Blink non configurée');
      return this.interpretDTCCodes(dtcCodes); // Fallback sur affichage brut
    }

    try {
      // TODO: Appel HTTP à l'agent Blink
      // const response = await fetch(BLINK_AGENT_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ codes: dtcCodes })
      // });
      // const result = await response.json();
      // return result;

      console.log('🔮 Agent Blink - À implémenter');
      return this.interpretDTCCodes(dtcCodes); // Fallback temporaire
    } catch (error: any) {
      console.error('❌ Erreur Agent Blink:', error);
      return this.interpretDTCCodes(dtcCodes); // Fallback
    }
  }

  /**
   * Formater le résultat pour affichage utilisateur
   */
  static formatInterpretationForDisplay(result: OBD2InterpretationResult): string {
    if (!result.success) {
      return `❌ ${result.error || 'Erreur lecture codes'}`;
    }

    let output = `${result.messageGlobal}\n\n`;

    if (result.interpretations && result.interpretations.length > 0) {
      output += '📋 CODES DÉTECTÉS:\n\n';
      
      result.interpretations.forEach((interp) => {
        output += `• ${interp.code}\n`;
      });
      
      output += '\n⚠️ Consultez un mécanicien pour interpréter ces codes.';
    }

    return output;
  }

  /**
   * Déterminer si le véhicule peut circuler comme taxi
   * Pour le moment, retourne toujours false si des codes sont détectés
   */
  static canVehicleOperate(result: OBD2InterpretationResult): boolean {
    if (!result.success) return false;
    if (result.statutVehicule === 'non-conforme') return false;
    
    // Si des codes sont détectés, recommander consultation mécanicien
    if (result.interpretations && result.interpretations.length > 0) {
      return false;
    }
    
    return result.statutVehicule === 'conforme';
  }
}
