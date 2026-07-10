"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { getStoredConsent, subscribeConsent } from "@/lib/consent";

/**
 * Meta Pixel opcional para medir conversão do tráfego pago. Duas condições
 * para entrar na página: NEXT_PUBLIC_META_PIXEL_ID definida E consentimento
 * de medição aceito no banner (LGPD). Sem qualquer uma delas, nada é
 * injetado. O snippet base já dispara o PageView; o evento de conversão
 * (CompleteRegistration) fica com <WelcomeConversion/> no dashboard.
 */
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  // No servidor não há escolha (null); no cliente lê o localStorage e
  // re-renderiza quando o banner dispara a mudança.
  const choice = useSyncExternalStore(
    subscribeConsent,
    getStoredConsent,
    () => null,
  );

  if (!pixelId || choice !== "granted") return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
    </Script>
  );
}
