export interface DrillStep {
  id: string;
  speakerName: string;
  speakerRole: string; // Fictional role only
  dialogue: {
    en: string;
    hi: string;
    hing: string;
  };
  options: {
    id: string;
    text: {
      en: string;
      hi: string;
      hing: string;
    };
    nextStepId?: string;
    outcome?: 'safe' | 'almost' | 'try_again'; // HARD RULE: Never 'failed' or 'wrong'
    feedback: {
      en: string;
      hi: string;
      hing: string;
    };
  }[];
}

export interface ScenarioDefinition {
  id: string;
  title: {
    en: string;
    hi: string;
    hing: string;
  };
  fictionalAgency: string; // Strictly fictional
  description: {
    en: string;
    hi: string;
    hing: string;
  };
  initialStepId: string;
  steps: Record<string, DrillStep>;
}

export const SCENARIO_PARCEL_VERIFICATION: ScenarioDefinition = {
  id: 'parcel_verification_01',
  title: {
    en: 'Fictional Parcel Inquiry Call',
    hi: 'काल्पनिक पार्सल जांच कॉल',
    hing: 'Fictional Parcel Inquiry Call'
  },
  fictionalAgency: 'Central Cyber Verification Bureau',
  description: {
    en: 'A caller claiming to be from the fictional Central Cyber Verification Bureau claims an illegal parcel was registered under your name.',
    hi: 'काल्पनिक सेंट्रल साइबर वेरिफिकेशन ब्यूरो का एक कॉलर दावा करता है कि आपके नाम पर संदिग्ध पार्सल मिला है।',
    hing: 'Fictional Central Cyber Verification Bureau se call aati hai ki aapke naam par illegal parcel mila hai.'
  },
  initialStepId: 'step_intro',
  steps: {
    step_intro: {
      id: 'step_intro',
      speakerName: 'Officer R. Sharma (Simulation Actor)',
      speakerRole: 'Verification Assistant - Central Cyber Verification Bureau',
      dialogue: {
        en: 'This is Central Cyber Verification Bureau. We detected an unauthorized courier packet registered under your Aadhaar. Do not disconnect; you are under digital surveillance.',
        hi: 'यह सेंट्रल साइबर वेरिफिकेशन ब्यूरो है। आपके आधार पर एक संदिग्ध पार्सल मिला है। फोन मत काटिए, आप डिजिटल निगरानी में हैं।',
        hing: 'Yeh Central Cyber Verification Bureau hai. Aapke Aadhaar par unauthorized packet mila hai. Call mat kaatiye, aap digital surveillance mein hain.'
      },
      options: [
        {
          id: 'opt_disconnect',
          text: {
            en: 'Disconnect immediately and tap Pause',
            hi: 'तुरंत कॉल काटें और पॉज़ (Pause) दबाएं',
            hing: 'Turant call cut karein aur Pause dabayein'
          },
          outcome: 'safe',
          feedback: {
            en: 'Safe: You disconnected immediately! Real law enforcement never puts citizens under "digital arrest" or forbids hanging up.',
            hi: 'सुरक्षित (Safe): आपने तुरंत कॉल काट दी! असली जांच एजेंसियां कभी वीडियो कॉल पर गिरफ्तारी नहीं करतीं।',
            hing: 'Safe: Aapne call turant cut kar di! Real officers video par arrest nahi karte.'
          }
        },
        {
          id: 'opt_pause_family',
          text: {
            en: 'Say "I am pausing to consult my family" and disconnect',
            hi: 'कहें "मैं अपने परिवार से बात करके कॉल करूंगा" और फोन काटें',
            hing: 'Bolein "Main family se consult karke call back karunga" aur disconnect karein'
          },
          outcome: 'safe',
          feedback: {
            en: 'Safe: Great protective reaction! Involving your family stops fear tactics in their tracks.',
            hi: 'सुरक्षित (Safe): बहुत अच्छा सुरक्षात्मक कदम! परिवार को साथ लाने से कोई भी आपको डरा नहीं सकता।',
            hing: 'Safe: Bahut badhiya! Family ko involve karne se koi aapko manipulate nahi kar sakta.'
          }
        },
        {
          id: 'opt_ask_badge',
          text: {
            en: 'Ask to see their official identity card on camera',
            hi: 'कैमरे पर उनका पहचान पत्र (ID कार्ड) दिखाने को कहें',
            hing: 'Camera par unka ID card dikhane ko bolein'
          },
          outcome: 'almost',
          feedback: {
            en: 'Almost: Good instinct to question them, but scammers often show forged cards. It is always safest to hang up directly.',
            hi: 'लगभग सही (Almost): सवाल पूछना अच्छी सोच है, पर ठग नकली पहचान पत्र बना लेते हैं। फोन काटना ही सबसे सुरक्षित उपाय है।',
            hing: 'Almost: Sawaal poochna theek instinct tha, par scammers fake ID bana lete hain. Call cut karna sabse safe hai.'
          }
        },
        {
          id: 'opt_comply',
          text: {
            en: 'Stay on call and follow their instructions',
            hi: 'कॉल पर बने रहें और उनके निर्देशों का पालन करें',
            hing: 'Call par bane rahein aur instructions follow karein'
          },
          outcome: 'try_again',
          feedback: {
            en: 'Let\'s try again: Scammers use fear to keep you on the line. You always have the legal right to hang up.',
            hi: 'फिर से कोशिश करें (Let\'s try again): कॉलर आपको डराने की कोशिश कर रहा है। याद रखें, आप कभी भी फोन काट सकते हैं।',
            hing: 'Let\'s try again: Scammers fear create karte hain. Aap hamesha call cut karne ke haqdaar hain.'
          }
        }
      ]
    }
  }
};

import digitalArrestJson from './digital_arrest.json';
import type { Scenario } from '../engine/types';
export const DIGITAL_ARREST_SCENARIO: Scenario = digitalArrestJson as Scenario;
export { digitalArrestJson };

export interface AvailableScenario {
  id: string;
  name: string;
  scenario: Scenario;
}

export const AVAILABLE_SCENARIOS: AvailableScenario[] = [
  {
    id: DIGITAL_ARREST_SCENARIO.id,
    name: 'Digital Arrest',
    scenario: DIGITAL_ARREST_SCENARIO
  }
];


