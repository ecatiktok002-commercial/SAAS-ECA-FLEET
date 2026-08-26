import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Calendar, 
  Car, 
  FileCheck, 
  Users, 
  Settings, 
  HelpCircle, 
  MessageSquare, 
  ChevronDown, 
  ExternalLink, 
  Zap, 
  Sparkles, 
  Copy, 
  Check, 
  BarChart3,
  ShieldCheck,
  Clock,
  Send,
  AlertCircle,
  Lock,
  UserCheck,
  ShieldAlert,
  Wallet,
  Camera,
  CheckCheck,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TutorialStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  actionText: string;
  actionPath: string;
  icon: React.ReactNode;
  tips: string[];
}

interface GuideSection {
  id: string;
  category: string;
  title: string;
  badge?: string;
  icon: React.ReactNode;
  summary: string;
  steps: { title: string; detail: string }[];
  proTips: string[];
  relatedPath?: string;
  relatedLabel?: string;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const { staffRole, subscriberTier, companyName } = useAuth();
  
  // Is this user an agent or staff member (non-admin)?
  const isAgentUser = staffRole === 'agent' || staffRole === 'staff';
  const isAdmin = staffRole === 'admin';

  // For admins, allow toggling between Subscriber View and Agent Guide preview
  const [viewMode, setViewMode] = useState<'subscriber' | 'agent'>(() => {
    return isAgentUser ? 'agent' : 'subscriber';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<string>('all');

  // Stored onboarding steps per role view
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    try {
      const key = `ecafleet_onboarding_${viewMode}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [1];
    } catch {
      return [1];
    }
  });

  const toggleStep = (stepId: number) => {
    const next = completedSteps.includes(stepId)
      ? completedSteps.filter(id => id !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(next);
    localStorage.setItem(`ecafleet_onboarding_${viewMode}`, JSON.stringify(next));
  };

  // Switch view handler (admins only)
  const handleViewModeChange = (mode: 'subscriber' | 'agent') => {
    setViewMode(mode);
    setActiveGuideTab('all');
    setSearchQuery('');
    try {
      const key = `ecafleet_onboarding_${mode}`;
      const saved = localStorage.getItem(key);
      setCompletedSteps(saved ? JSON.parse(saved) : [1]);
    } catch {
      setCompletedSteps([1]);
    }
  };

  // ==========================================
  // 1. SUBSCRIBER / OWNER DATA DEFINITIONS
  // ==========================================
  const subscriberTutorialSteps: TutorialStep[] = [
    {
      id: 1,
      title: '1. Register Your Vehicles in Fleet Guardian',
      subtitle: 'Setup initial fleet inventory',
      description: 'Add your car plates, models, daily rental rates, current mileage, and road tax expiration dates to enable automated availability & maintenance alerts.',
      actionText: 'Manage Vehicles',
      actionPath: '/fleet',
      icon: <Car className="w-5 h-5 text-blue-600" />,
      tips: [
        'Ensure plate numbers are entered without extra spaces for seamless WhatsApp bot lookup.',
        'Set road tax & insurance dates to receive proactive warning alerts 30 days prior to expiry.'
      ]
    },
    {
      id: 2,
      title: '2. Invite Staff & Configure Commission Rates',
      subtitle: 'Set up your sales agents and team',
      description: 'Register sales agents and operational staff. Assign commission percentages (e.g., 30%) or fixed amounts so payouts are calculated automatically on every booking.',
      actionText: 'Staff Settings',
      actionPath: '/staff',
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      tips: [
        'Admins can grant Agent or Operator roles with customized access levels.',
        'Agents only see their personal booking statistics and commission earnings.'
      ]
    },
    {
      id: 3,
      title: '3. Create & Send Digital Rental Agreements',
      subtitle: 'Paperless, legally compliant e-signatures',
      description: 'Generate customer rental agreements in seconds. Send the instant signing link via WhatsApp where customers can verify terms, upload IC/License photos, and sign digitally.',
      actionText: 'Create Agreement',
      actionPath: '/forms',
      icon: <FileText className="w-5 h-5 text-amber-600" />,
      tips: [
        'Customers receive a dedicated mobile-friendly link to sign on their smartphone.',
        'Uploaded driver licenses and ICs are securely linked to the agreement for instant audit.'
      ]
    },
    {
      id: 4,
      title: '4. Reconcile Bookings with Matchy Scan & Payout Audit',
      subtitle: 'Automated booking verification and commission approval',
      description: 'The automated Matchy Scan engine pairs incoming WhatsApp reservations with signed digital agreements. Verify receipts, check date discrepancies, and approve payouts with one click.',
      actionText: 'Open Audit & Payouts',
      actionPath: '/audit',
      icon: <FileCheck className="w-5 h-5 text-purple-600" />,
      tips: [
        'Use Matchy Scan to easily link unassigned/orphaned bookings with digital contracts.',
        'Export monthly payout summaries or mark staff commissions as Paid in batches.'
      ]
    }
  ];

  const subscriberGuides: GuideSection[] = [
    {
      id: 'digital-forms',
      category: 'forms',
      title: 'Digital Forms & Paperless Agreements',
      badge: 'Tier 1+',
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      summary: 'Replace paper contracts with fast, mobile-ready digital agreements with signature capture and identity verification.',
      steps: [
        {
          title: 'Fill Agreement Details',
          detail: 'Select the car from your fleet, enter the customer name, phone number, rental period, and rate calculation (automatic daily multiplication).'
        },
        {
          title: 'Generate WhatsApp Signing Link',
          detail: 'Click "Share to WhatsApp" or copy the customer link. The customer opens the web portal on their phone without installing any app.'
        },
        {
          title: 'Customer Review & E-Signature',
          detail: 'The customer inspects the terms, uploads their Driving License / IC photos, inputs their emergency contact, and provides their digital signature.'
        },
        {
          title: 'PDF & Printable Generation',
          detail: 'Once signed, download a formal Malaysian car rental contract in PDF format ready for filing or handover.'
        }
      ],
      proTips: [
        'Use the "Public Handover Inspection" link to take 360° photos of existing scratches and fuel levels before giving the keys.',
        'If a customer amends their schedule, use the "Pending Changes" workflow to adjust dates without re-creating the entire agreement.'
      ],
      relatedPath: '/forms',
      relatedLabel: 'Go to Digital Forms'
    },
    {
      id: 'calendar',
      category: 'calendar',
      title: 'Smart Fleet Schedule & Booking Calendar',
      badge: 'Tier 2+',
      icon: <Calendar className="w-6 h-6 text-emerald-600" />,
      summary: 'Visualize your entire fleet schedule on a responsive monthly timeline with conflict detection and quick reservation creation.',
      steps: [
        {
          title: 'Visual Timeline View',
          detail: 'Each car plate has a dedicated row. Active bookings are color-coded by status (Reserved, Handed Over, Completed, or Blocked).'
        },
        {
          title: 'Conflict & Overlap Prevention',
          detail: 'The system automatically detects booking overlaps. It prevents double-booking the same car plate for the same pickup window.'
        },
        {
          title: 'Quick Booking Creation',
          detail: 'Click any date slot on a vehicle row to quickly book a reservation, select an agent, and specify pickup/return times.'
        }
      ],
      proTips: [
        'Use the search filter at the top of the calendar to quickly check availability for a specific vehicle model (e.g., "Axia", "Bezza", "Vios").',
        'Switch between Monthly and List view depending on whether you are on desktop or a mobile tablet.'
      ],
      relatedPath: '/calendar',
      relatedLabel: 'Open Fleet Calendar'
    },
    {
      id: 'fleet-guardian',
      category: 'fleet',
      title: 'Fleet Guardian: Vehicle Health & Road Tax',
      badge: 'Tier 3',
      icon: <Car className="w-6 h-6 text-amber-600" />,
      summary: 'Maintain vehicle uptime, track servicing intervals, and stay compliant with road tax and insurance renewals.',
      steps: [
        {
          title: 'Add & Organize Vehicles',
          detail: 'Record the plate number, brand, model, transmission (Auto/Manual), fuel type, and default daily/weekly rental rates.'
        },
        {
          title: 'Compliance Warnings',
          detail: 'The dashboard highlights vehicles with expiring Road Tax or Insurance (flags amber at 30 days and red when expired).'
        },
        {
          title: 'Service & Maintenance Logs',
          detail: 'Record oil changes, tire rotations, brake pad replacements, and general workshop maintenance with cost tracking.'
        }
      ],
      proTips: [
        'Temporarily set vehicle status to "Maintenance" to automatically block it from WhatsApp availability quotes and calendar reservations.',
        'Keep standard daily rates updated so the WhatsApp AI Agent quotes accurate market pricing to prospective renters.'
      ],
      relatedPath: '/fleet',
      relatedLabel: 'Open Fleet Guardian'
    },
    {
      id: 'matchy-audit',
      category: 'audit',
      title: 'Matchy Scan & Payout Reconciliation',
      badge: 'Tier 3',
      icon: <FileCheck className="w-6 h-6 text-purple-600" />,
      summary: 'Ensure zero revenue leakage. Link digital forms with bookings, verify payment slips, and pay agent commissions accurately.',
      steps: [
        {
          title: 'Automatic Heuristic Matching',
          detail: 'Matchy Scan automatically correlates WhatsApp bookings with digital agreements by matching customer phone numbers, car plates, and dates.'
        },
        {
          title: 'Resolve Non-Matched Bookings',
          detail: 'If an agreement was filled manually or has minor typos, use the "Link Booking" action to manually pair them with a single click.'
        },
        {
          title: 'Receipt Verification & Discrepancy Check',
          detail: 'Compare the booking amount against the signed agreement price and payment receipt to catch price differences immediately.'
        },
        {
          title: 'Commission Approval & Ledger Payout',
          detail: 'Review calculated agent commissions and approve payouts individually or in monthly batches for your accounting records.'
        }
      ],
      proTips: [
        'Look for the "Non-Matched Bookings" alert banner at the top of the Audit page to resolve orphaned records.',
        'Approved payouts can be exported or marked as "Paid" to update agent personal statistics in real-time.'
      ],
      relatedPath: '/audit',
      relatedLabel: 'Go to Audit & Payouts'
    },
    {
      id: 'crm-customers',
      category: 'crm',
      title: 'Customer Directory & Risk Screening',
      badge: 'Tier 3',
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      summary: 'Protect your rental assets with customer rental history, driving license verification, and blacklist warnings.',
      steps: [
        {
          title: 'Customer Directory',
          detail: 'Search any customer by IC number, phone, or name to view their complete rental timeline and total lifetime spend.'
        },
        {
          title: 'Risk Flagging & Blacklisting',
          detail: 'Flag problem renters for unpaid summons, reckless driving, or vehicle damage to warn your agents on future bookings.'
        },
        {
          title: 'Document Quick Access',
          detail: 'Access uploaded ICs, driving licenses, and utility bills whenever needed for police reports or insurance claims.'
        }
      ],
      proTips: [
        'Before confirming a booking, search the customer in CRM to check their previous reliability and rental count.',
        'High-value returning customers can be awarded preferential rates or expedited digital handovers.'
      ],
      relatedPath: '/customers',
      relatedLabel: 'View Customer CRM'
    },
    {
      id: 'whatsapp-agent',
      category: 'agent',
      title: 'WhatsApp AI Agent & Helpdesk Integration',
      badge: 'AI Core',
      icon: <MessageSquare className="w-6 h-6 text-teal-600" />,
      summary: 'How the 24/7 WhatsApp AI Bot handles rental inquiries, checks vehicle availability, and routes bookings.',
      steps: [
        {
          title: 'Automatic Lead Capture',
          detail: 'When a customer messages your WhatsApp business number, the Gemini AI Agent parses their requested rental dates and preferred car category.'
        },
        {
          title: 'Real-Time Availability Check',
          detail: 'The AI checks your database in real-time to find available cars, providing accurate quotes based on duration and seasonal pricing.'
        },
        {
          title: 'Human Handover Escalation',
          detail: 'When a customer requests custom discounts or wants to confirm payment, the AI creates a booking draft and notifies your sales team.'
        }
      ],
      proTips: [
        'Make sure your fleet prices and car plate statuses are kept up to date so the WhatsApp AI always quotes available vehicles accurately.',
        'Review the Agent Dashboard to see live conversion rates and commission distributions across your sales team.'
      ],
      relatedPath: '/agent-dashboard',
      relatedLabel: 'Open Agent Dashboard'
    }
  ];

  const subscriberFaqs: FAQItem[] = [
    {
      category: 'agreements',
      question: 'How do I send an agreement to a customer who doesn’t have the app?',
      answer: 'Customers do NOT need to install anything! Simply click "Share WhatsApp" or copy the signing link from the Digital Forms tab. The customer opens it in any browser (Safari, Chrome) on their phone to review terms, upload photo documents, and sign.'
    },
    {
      category: 'audit',
      question: 'What does "Non-Matched Bookings" in Matchy Scan mean?',
      answer: 'This happens when a digital agreement was signed or created without being explicitly linked to a calendar booking ID (or vice versa). You can easily click "Link Booking" inside the alert banner to associate the agreement with its corresponding reservation.'
    },
    {
      category: 'staff',
      question: 'Can sales agents see other agents’ commissions or total company revenue?',
      answer: 'No. The platform enforces strict role-based data isolation. Sales agents can only see their own assigned bookings, their personal commission earnings, and personal statistics. Only Admins have access to the Business Dashboard, Full Revenue Reports, and Staff Payouts.'
    },
    {
      category: 'fleet',
      question: 'How do I block a vehicle for maintenance or repairs?',
      answer: 'Navigate to Fleet Guardian (/fleet), edit the vehicle, and change its status from "Available" to "Maintenance". This automatically stops the WhatsApp AI bot from suggesting it and warns staff if they attempt to schedule it on the calendar.'
    },
    {
      category: 'calendar',
      question: 'How do I handle booking date extensions or early returns?',
      answer: 'On the Calendar or Digital Forms page, click on the active booking and edit the Return Date / Time. The system will recalculate the duration and prompt for any additional payment or commission adjustments.'
    },
    {
      category: 'agreements',
      question: 'Are digital signatures and uploaded IC/License photos legally binding?',
      answer: 'Yes, under the Malaysian Electronic Commerce Act 2006, digital agreements signed with verified consent and timestamped digital signatures are recognized. The system embeds IP timestamps, user identification, and document photos directly into the printable contract.'
    }
  ];

  // ==========================================
  // 2. SALES AGENT SPECIFIC DATA DEFINITIONS
  // ==========================================
  const agentTutorialSteps: TutorialStep[] = [
    {
      id: 1,
      title: '1. Check Live Vehicle Availability on Calendar',
      subtitle: 'Find free cars for incoming leads',
      description: 'Open the Fleet Calendar to inspect active vehicle schedules. Check which car plates are available for your customer’s requested pickup and return dates.',
      actionText: 'Open Calendar',
      actionPath: '/calendar',
      icon: <Calendar className="w-5 h-5 text-emerald-600" />,
      tips: [
        'Always verify turnaround times so the car has at least 1–2 hours buffer for cleaning before pickup.',
        'Use the model filter at the top to quickly check availability for Axia, Bezza, Myvi, or Vios.'
      ]
    },
    {
      id: 2,
      title: '2. Create & Send Digital Agreement via WhatsApp',
      subtitle: 'Fast e-signature & IC/License collection',
      description: 'Go to Digital Forms, create a new agreement with customer details, and click "Share to WhatsApp". The customer signs on their phone in under 60 seconds.',
      actionText: 'Create Agreement',
      actionPath: '/forms',
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      tips: [
        'Make sure the agreement is assigned to your Agent name so your commission is recorded properly.',
        'Customers can upload both their Malaysian IC / Passport and Driving License photos directly.'
      ]
    },
    {
      id: 3,
      title: '3. Perform Vehicle Handover & Photo Inspection',
      subtitle: 'Protect against pre-existing damage',
      description: 'Use the Handover Form inspection link when meeting the customer. Record odometer mileage, fuel bar levels, and upload photos of any existing scratches.',
      actionText: 'View Digital Forms',
      actionPath: '/forms',
      icon: <Camera className="w-5 h-5 text-amber-600" />,
      tips: [
        'Taking 4 clear corner photos takes less than 30 seconds and protects you from damage disputes.',
        'Make sure the customer confirms the starting fuel gauge level before handing over keys.'
      ]
    },
    {
      id: 4,
      title: '4. Track Your Commissions & Returns on Agent Dashboard',
      subtitle: 'Monitor sales volume & payout stages',
      description: 'Check your personal Agent Dashboard for real-time commission earnings, upcoming car deliveries, overdue return alerts, and monthly sales targets.',
      actionText: 'Agent Dashboard',
      actionPath: '/agent-dashboard',
      icon: <Wallet className="w-5 h-5 text-purple-600" />,
      tips: [
        'Commissions move from Pending Review -> Approved -> Paid once management audits the payment receipt.',
        'Confirm completed car returns directly with 1-click on your dashboard.'
      ]
    }
  ];

  const agentGuides: GuideSection[] = [
    {
      id: 'agent-digital-forms',
      category: 'forms',
      title: 'Creating & Sharing Digital Rental Agreements',
      badge: 'Core Workflow',
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      summary: 'Generate paperless contracts, send customer signing links via WhatsApp, and collect required identity documents.',
      steps: [
        {
          title: 'Start a New Agreement',
          detail: 'Select the available car plate, enter customer name, phone number, and rental duration. The system automatically computes standard rental totals.'
        },
        {
          title: 'Share WhatsApp Signing Link',
          detail: 'Click "Share WhatsApp" or copy the secure link. Send it directly to the customer’s WhatsApp chat.'
        },
        {
          title: 'Customer Self-Service Signing',
          detail: 'The customer opens the link on their mobile browser, reviews terms, snaps photos of their IC & Driving License, and signs on screen.'
        },
        {
          title: 'Verify Signed Status',
          detail: 'Once signed, the status updates to "Signed" in your forms list. You can print or download the formal PDF agreement at any time.'
        }
      ],
      proTips: [
        'Always ensure your Agent profile is selected as the booking agent so your commission is attributed automatically.',
        'If a customer needs to adjust rental dates before pickup, use "Request Changes" to modify without starting from scratch.'
      ],
      relatedPath: '/forms',
      relatedLabel: 'Open Digital Forms'
    },
    {
      id: 'agent-calendar',
      category: 'calendar',
      title: 'Fleet Calendar & Live Availability',
      badge: 'Booking Tool',
      icon: <Calendar className="w-6 h-6 text-emerald-600" />,
      summary: 'Quickly find available vehicles, check pickup buffers, and reserve cars for incoming inquiries.',
      steps: [
        {
          title: 'Check Free Vehicle Dates',
          detail: 'Open the monthly timeline to see which vehicle rows are unoccupied for your lead’s desired dates.'
        },
        {
          title: 'Create Quick Reservation',
          detail: 'Click any available date slot on the car’s row to open the booking dialog. Enter customer details and rental rates.'
        },
        {
          title: 'Avoid Overlaps & Conflicts',
          detail: 'The calendar will alert you if another agent or the WhatsApp bot already reserved that car plate for the same window.'
        }
      ],
      proTips: [
        'Green/Blue bars indicate confirmed bookings, while amber/striped bars indicate vehicles scheduled for maintenance.',
        'Filter by car model (e.g. "Bezza") to quickly find replacement vehicles if a customer’s first choice is unavailable.'
      ],
      relatedPath: '/calendar',
      relatedLabel: 'Open Calendar'
    },
    {
      id: 'agent-dashboard-guide',
      category: 'dashboard',
      title: 'Agent Dashboard & Commission Tracking',
      badge: 'Personal Stats',
      icon: <Wallet className="w-6 h-6 text-purple-600" />,
      summary: 'Monitor your monthly sales revenue, commission pipeline (Pending vs Paid), and upcoming customer delivery tasks.',
      steps: [
        {
          title: 'Personal Sales & Commission Meter',
          detail: 'View your total sales volume, completed agreements, and earned commission for the current month.'
        },
        {
          title: 'Commission Payout Stages',
          detail: 'Pending Review (awaiting admin audit) -> Approved (verified) -> Paid (disbursed to your account).'
        },
        {
          title: 'Upcoming Deliveries & Overdue Returns',
          detail: 'See list of cars scheduled for handover today, and vehicles overdue for return so you can follow up with the renter.'
        }
      ],
      proTips: [
        'Check the Gamification & Sales Target widget to see your progress toward monthly milestone incentives.',
        'Use the 1-click "Confirm Return" button on your dashboard once the customer returns the keys and vehicle is inspected.'
      ],
      relatedPath: '/agent-dashboard',
      relatedLabel: 'Open Agent Dashboard'
    },
    {
      id: 'agent-handover',
      category: 'handover',
      title: 'Vehicle Handover & Return Inspection',
      badge: 'Field Ops',
      icon: <Camera className="w-6 h-6 text-amber-600" />,
      summary: 'Record pre-existing body scratches, odometer reading, and fuel levels during key handover to protect against disputes.',
      steps: [
        {
          title: 'Open Handover Inspection',
          detail: 'From your signed agreement, click "Handover Form" or open the mobile inspection link on your smartphone.'
        },
        {
          title: 'Document Condition & Fuel',
          detail: 'Input current odometer reading (KM) and fuel gauge level (e.g., 4/8 bars or 100% full).'
        },
        {
          title: 'Upload Exterior Photos',
          detail: 'Take quick photos of the front, rear, left, and right sides to document existing condition before handing over keys.'
        }
      ],
      proTips: [
        'Always ensure the customer is present when noting down starting fuel levels to avoid return disputes.',
        'If the car returns with less fuel or damages, notify your supervisor immediately with the before/after photos.'
      ],
      relatedPath: '/forms',
      relatedLabel: 'View Agreements'
    }
  ];

  const agentFaqs: FAQItem[] = [
    {
      category: 'commissions',
      question: 'When will my commission be paid?',
      answer: 'Commissions are audited and disbursed according to your company’s payout schedule (e.g. weekly or monthly). Once the customer completes their rental and the payment receipt is verified by management, your commission status changes from "Pending" to "Approved" and then "Paid".'
    },
    {
      category: 'permissions',
      question: 'Why can’t I see other sales agents’ bookings or company financial reports?',
      answer: 'The system enforces strict role-based data isolation for privacy and security. As an agent, you have a private workspace where you only see your own customer agreements, assigned bookings, and personal commission earnings.'
    },
    {
      category: 'rates',
      question: 'Can I change vehicle rates or offer special discounts to customers?',
      answer: 'Standard rental rates are configured centrally by management. You can adjust the agreement total during creation if approved by your manager, but base fleet inventory settings remain managed by administrators.'
    },
    {
      category: 'agreements',
      question: 'What if the customer does not have an internet connection to sign?',
      answer: 'You can open the signing link on your own phone or tablet and hand it to the customer in person so they can review terms and sign directly on your screen.'
    },
    {
      category: 'returns',
      question: 'What should I do if a customer returns the car late or with less fuel?',
      answer: 'Do not mark the return completed immediately. Take photos of the fuel gauge and current odometer, calculate any extra rental hours or fuel shortage fees, and contact your manager to issue an amended invoice or collect the difference.'
    },
    {
      category: 'fleet',
      question: 'What does it mean if a car row on the calendar is marked "Maintenance"?',
      answer: 'This vehicle is currently undergoing scheduled servicing, road tax renewal, or mechanical repairs. It is temporarily locked and cannot be booked until management restores its status to "Available".'
    }
  ];

  // Active dataset based on view mode
  const activeTutorialSteps = viewMode === 'agent' ? agentTutorialSteps : subscriberTutorialSteps;
  const activeGuides = viewMode === 'agent' ? agentGuides : subscriberGuides;
  const activeFaqs = viewMode === 'agent' ? agentFaqs : subscriberFaqs;

  const filteredGuides = useMemo(() => {
    return activeGuides.filter(guide => {
      const matchesCategory = activeGuideTab === 'all' || guide.category === activeGuideTab;
      const matchesSearch = searchQuery === '' || 
        guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.steps.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.detail.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeGuides, activeGuideTab, searchQuery]);

  const filteredFaqs = useMemo(() => {
    return activeFaqs.filter(faq => {
      if (!searchQuery) return true;
      return faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
             faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [activeFaqs, searchQuery]);

  const progressPercentage = Math.round((completedSteps.length / activeTutorialSteps.length) * 100);

  const handleCopySupport = () => {
    navigator.clipboard.writeText('support@ecagroup.com');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          {/* Top Role Selector / Mode Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                  viewMode === 'agent'
                    ? 'bg-purple-500/10 border-purple-400/30 text-purple-300'
                    : 'bg-blue-500/10 border-blue-400/30 text-blue-300'
                }`}>
                  {viewMode === 'agent' ? <Award className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                  {viewMode === 'agent' ? 'Sales Agent Operations Manual' : 'Subscriber & Owner Knowledge Base'}
                </div>

                {/* If user is Admin, provide explicit Toggle between Subscriber and Agent view */}
                {isAdmin && (
                  <div className="inline-flex p-0.5 bg-slate-800/90 border border-slate-700 rounded-lg">
                    <button
                      onClick={() => handleViewModeChange('subscriber')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        viewMode === 'subscriber'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      👑 Subscriber View
                    </button>
                    <button
                      onClick={() => handleViewModeChange('agent')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        viewMode === 'agent'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💼 Agent Guide Preview
                    </button>
                  </div>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {viewMode === 'agent' ? 'Sales Agent Quick Start & Operations' : 'Help & Getting Started Guide'}
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                {viewMode === 'agent'
                  ? `Welcome to the ${companyName || 'EcaFleet'} Agent Portal. Learn how to check fleet availability, issue WhatsApp rental agreements, perform handovers, and track your personal commissions.`
                  : `Master the ${companyName || 'EcaFleet'} platform. Learn how to manage your fleet, issue paperless agreements, automate WhatsApp bookings, and audit staff payouts.`}
              </p>
            </div>

            {/* Quick Stats or Status */}
            <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-5 shrink-0 min-w-[260px] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {viewMode === 'agent' ? 'Agent Onboarding' : 'Setup Progress'}
                </span>
                <span className={`text-xs font-bold ${viewMode === 'agent' ? 'text-purple-400' : 'text-blue-400'}`}>
                  {completedSteps.length} of {activeTutorialSteps.length} Steps
                </span>
              </div>
              <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    viewMode === 'agent'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-400'
                      : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {progressPercentage === 100 
                  ? 'All steps completed! You are fully set up.' 
                  : 'Follow these core steps to complete your setup.'}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-3xl">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  viewMode === 'agent'
                    ? "Search agent topics, e.g. 'Commission', 'Handover', 'Calendar availability', 'WhatsApp signing'..."
                    : "Search topics, e.g., 'Digital signatures', 'Matchy scan', 'Road tax', 'Commissions'..."
                }
                className="w-full pl-12 pr-4 py-3.5 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 space-y-10">
        
        {/* AGENT ROLE LIMITATION & SCOPE NOTICE (Shown in Agent view) */}
        {viewMode === 'agent' && (
          <div className="bg-white rounded-2xl border border-purple-200/80 shadow-md p-6 overflow-hidden relative">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-xl shrink-0 mt-0.5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Agent Workspace Scope & Boundaries</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      Role: Sales Agent
                    </span>
                  </h3>
                  <span className="text-xs text-slate-500">Managed by {companyName || 'Subscriber Admin'}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  As an authorized sales agent, your workspace is focused on converting leads, generating contracts, inspecting vehicles, and tracking personal commissions. Here is a clear summary of your tools and system boundaries:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl space-y-1.5">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      What You Can Do (Agent Permissions):
                    </span>
                    <ul className="text-[11px] text-emerald-800 space-y-1 pl-5 list-disc">
                      <li>Check vehicle availability & create bookings on the Calendar.</li>
                      <li>Draft & send digital agreements with WhatsApp signing links.</li>
                      <li>Conduct mobile handover inspections (photos, mileage, fuel bar).</li>
                      <li>View your private commission ledger and payout status.</li>
                      <li>Confirm completed vehicle returns with 1-click on your dashboard.</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-slate-500" />
                      Admin-Only Functions (Not in Agent View):
                    </span>
                    <ul className="text-[11px] text-slate-600 space-y-1 pl-5 list-disc">
                      <li>Adding new cars or changing baseline company rental rates.</li>
                      <li>Viewing other agents’ sales data or company revenue reports.</li>
                      <li>Approving and disbursing commission payout batches.</li>
                      <li>Editing staff accounts, commissions percentages, or system branding.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Checklist Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {viewMode === 'agent' ? 'Sales Agent Step-by-Step Tutorial' : 'Quick-Start Onboarding Tutorial'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {viewMode === 'agent'
                  ? 'Follow these 4 core steps to master booking creation, customer signing, and commission tracking.'
                  : 'Follow these 4 core steps to get your car rental business up and running immediately.'}
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full w-fit">
              {progressPercentage}% Completed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {activeTutorialSteps.map((step) => {
              const isDone = completedSteps.includes(step.id);
              return (
                <div 
                  key={step.id} 
                  className={`border rounded-xl p-4.5 transition-all flex flex-col justify-between ${
                    isDone 
                      ? 'border-emerald-200 bg-emerald-50/40' 
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                          {step.icon}
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${isDone ? 'text-emerald-950 line-through opacity-80' : 'text-slate-900'}`}>
                            {step.title}
                          </h3>
                          <p className="text-xs text-slate-500">{step.subtitle}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleStep(step.id)}
                        className={`p-1 rounded-md transition-colors ${
                          isDone 
                            ? 'text-emerald-600 hover:text-emerald-800' 
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={isDone ? 'Mark as incomplete' : 'Mark as done'}
                      >
                        <CheckCircle2 className={`w-6 h-6 ${isDone ? 'fill-emerald-100' : ''}`} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                      {step.description}
                    </p>

                    <div className="mt-3 bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-1.5">
                      {step.tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => toggleStep(step.id)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      {isDone ? 'Completed' : 'Mark Done'}
                    </button>
                    <button
                      onClick={() => navigate(step.actionPath)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span>{step.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Documentation Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                {viewMode === 'agent' ? 'Agent Daily Workflow Guides' : 'Core Platform Guides'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {viewMode === 'agent'
                  ? 'Detailed breakdowns of agreement generation, calendar booking, inspections, and commissions.'
                  : 'Detailed breakdowns of each module and company administrative workflows.'}
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {(viewMode === 'agent' ? [
                { id: 'all', label: 'All Guides' },
                { id: 'forms', label: 'Digital Agreements' },
                { id: 'calendar', label: 'Fleet Calendar' },
                { id: 'dashboard', label: 'Commission & Dashboard' },
                { id: 'handover', label: 'Inspection / Handover' }
              ] : [
                { id: 'all', label: 'All Modules' },
                { id: 'forms', label: 'Digital Forms' },
                { id: 'calendar', label: 'Calendar' },
                { id: 'fleet', label: 'Fleet Guardian' },
                { id: 'audit', label: 'Audit & Matchy' },
                { id: 'crm', label: 'CRM / Customers' },
                { id: 'agent', label: 'WhatsApp Bot' }
              ]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveGuideTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    activeGuideTab === tab.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guide Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredGuides.map((guide) => (
              <div 
                key={guide.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        {guide.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{guide.title}</h3>
                          {guide.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {guide.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{guide.summary}</p>
                      </div>
                    </div>
                  </div>

                  {/* Step Walkthrough */}
                  <div className="mt-5 space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      How It Works
                    </span>
                    <div className="space-y-2.5">
                      {guide.steps.map((s, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                            {idx + 1}
                          </div>
                          <div>
                            <strong className="text-slate-800 font-semibold">{s.title}: </strong>
                            <span className="text-slate-600">{s.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pro Tips */}
                  {guide.proTips.length > 0 && (
                    <div className="mt-5 p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pro Tips</span>
                      </div>
                      {guide.proTips.map((tip, idx) => (
                        <p key={idx} className="text-[11px] text-amber-800 pl-5 relative before:content-['•'] before:absolute before:left-1 before:font-bold">
                          {tip}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {guide.relatedPath && (
                  <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Ready to try it?</span>
                    <button
                      onClick={() => navigate(guide.relatedPath!)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 px-3.5 py-1.5 rounded-lg shadow-2xs transition-all"
                    >
                      <span>{guide.relatedLabel}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredGuides.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No guides matching "{searchQuery}"</p>
              <p className="text-xs text-slate-500 mt-1">Try searching with a different term like "forms", "calendar", or "commission".</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveGuideTab('all'); }}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>

        {/* Frequently Asked Questions Accordion */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <HelpCircle className="w-4 h-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {viewMode === 'agent' ? 'Sales Agent FAQ & Operational Answers' : 'Common Questions & Troubleshooting'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-xs">
              {viewMode === 'agent'
                ? 'Answers to common questions regarding commissions, inspections, and customer agreements.'
                : 'Quick solutions to standard operational and administrative questions.'}
            </p>
          </div>

          <div className="divide-y divide-slate-100 mt-4">
            {filteredFaqs.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div key={index} className="py-4">
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : index)}
                    className="w-full flex items-center justify-between text-left gap-4 group"
                  >
                    <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {faq.question}
                    </span>
                    <div className={`p-1 rounded-full bg-slate-100 text-slate-500 shrink-0 transition-transform ${isExpanded ? 'rotate-180 bg-blue-50 text-blue-600' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 pr-8 text-xs text-slate-600 leading-relaxed animate-in fade-in duration-200">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Need More Assistance Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-lg font-bold">
              {viewMode === 'agent' ? 'Need help with a booking or handover?' : 'Still need technical assistance?'}
            </h3>
            <p className="text-xs text-slate-300 max-w-md">
              {viewMode === 'agent'
                ? 'Contact your fleet manager or reach out to the helpdesk for assistance with customer contract amendments or vehicle swaps.'
                : 'Our support desk is ready to help your car rental company configure WhatsApp webhook integrations, custom commission splits, or fleet imports.'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleCopySupport}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied Email' : 'Copy Support Email'}</span>
            </button>
            <button
              onClick={() => window.open('https://wa.me/601110000000', '_blank')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Helpdesk</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
