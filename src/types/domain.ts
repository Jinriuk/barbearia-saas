export type MembershipRole =
  "owner" | "manager" | "receptionist" | "professional" | "client";

export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "suspended" | "canceled";

export type SubscriptionInfo = {
  status: SubscriptionStatus;
  plan: string;
  priceCents: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  /** Cancelamento pedido pelo dono; encerra no fim do período (Fase 0 §0.2). */
  cancelAtPeriodEnd: boolean;
};

export type TenantContext = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: string;
  vertical: "barber" | "salon";
  role: MembershipRole;
  profileId: string;
  profileName: string;
  /** Senha provisória criada pelo dono; o painel exige a troca (Fase 0 §0.17). */
  mustChangePassword: boolean;
  subscription: SubscriptionInfo | null;
};

export type ActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
};

export type PublicProfessional = {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  serviceIds: string[];
};

export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
};

export type PublicBarbershop = {
  barbershop: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    timezone: string;
    plan: string;
    vertical: "barber" | "salon";
  };
  settings: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    backgroundType: "color" | "image";
    backgroundImageUrl: string | null;
    fontFamily: string;
    heroTitle: string;
    heroSubtitle: string;
    bannerUrl: string | null;
    whatsappNumber: string | null;
    instagramUrl: string | null;
    address: string | null;
    openingHours: Record<string, string>;
    /** Modo de confirmação da reserva (Fase 1): a página nunca promete o que
     *  a barbearia não configurou. Ausente = manual. */
    bookingConfirmationMode?: "manual" | "auto";
  };
  services: PublicService[];
  professionals: PublicProfessional[];
  products: PublicProduct[];
  sections: Array<{
    key: string;
    title: string | null;
    body: string | null;
    imageUrl: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
  }>;
};
