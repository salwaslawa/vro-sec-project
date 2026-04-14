"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/types"; 
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT = 60 * 60 * 1000; 
const CHECK_INTERVAL = 5000;       
const THROTTLE_TIME = 2000;        

export function IdleLogoutHandler() {
  const { isLoggedIn, logout, updateActivity } = useAuthStore();
  const router = useRouter();
  const lastUpdateRef = useRef<number>(Date.now());
  
  
  const [isHydrated, setIsHydrated] = useState(false);

  
  useEffect(() => {
    
    const unsubHydrate = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return () => unsubHydrate();
  }, []);

  useEffect(() => {
    
    if (!isLoggedIn || !isHydrated) return;

    const initialCheck = () => {
      const currentLastActivity = useAuthStore.getState().lastActivity;
      
      
      if (currentLastActivity === 0) return false;

      const now = Date.now();
      const idleDuration = now - currentLastActivity;

      console.log(`Cek Awal: Anda sudah idle selama ${Math.floor(idleDuration / 1000)} detik`);

      if (idleDuration > IDLE_TIMEOUT) {
        console.warn("Sesi sudah hangus! Melempar ke login...");
        logout();
        router.push("/login");
        return true;
      }
      return false;
    };

    if (initialCheck()) return;

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastUpdateRef.current > THROTTLE_TIME) {
        updateActivity();
        lastUpdateRef.current = now;
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, handleUserActivity));

    const interval = setInterval(() => {
      const currentLastActivity = useAuthStore.getState().lastActivity;
      const now = Date.now();
      const idleDuration = now - currentLastActivity;

      console.log(`Monitoring: Idle ${Math.floor(idleDuration / 1000)}s`);

      if (idleDuration > IDLE_TIMEOUT) {
        logout();
        router.push("/login");
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
      clearInterval(interval);
    };
  }, [isLoggedIn, isHydrated, logout, updateActivity, router]);

  return null;
}