// Central theme palette and persisted theme preference.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const light = {
  primary:'#168653', primaryDark:'#0B6840', primaryLight:'#E6F4EC',
  secondary:'#E9A23B', accent:'#269B83', accentSoft:'#B9E7D2',
  background:'#F3F7F4', surface:'rgba(255,255,255,0.92)', surfaceSolid:'#FFFFFF',
  glass:'rgba(255,255,255,0.7)', glassBorder:'rgba(255,255,255,0.45)', glassDark:'rgba(15,40,30,0.45)',
  textDark:'#173629', textMid:'#63756B', textLight:'#91A197', textOnPrimary:'#FFFFFF',
  border:'#E0EAE3', borderStrong:'#B9D9C5',
  danger:'#C7463B', warning:'#D9872D', caution:'#B88B18', good:'#168653', info:'#347DB2',
  gradientPrimary:['#168653','#269B83'], gradientHero:['#0B6840','#168653','#269B83'],
  gradientSoft:['#EAF5EE','#F3F7F4'], gradientGlass:['rgba(255,255,255,0.7)','rgba(255,255,255,0.3)'],
  gradientDanger:['#FADBD8','#F5B7B1'], gradientWarning:['#FAE5D3','#F5CBA7'],
};
const dark = {
  ...light, primary:'#58C58B', primaryDark:'#23875A', primaryLight:'#183D2C',
  accent:'#64C8B0', accentSoft:'#285B48', background:'#101B16',
  surface:'rgba(28,43,35,0.96)', surfaceSolid:'#1C2B23',
  glass:'rgba(28,43,35,0.78)', glassBorder:'#344A3C', glassDark:'rgba(0,0,0,0.35)',
  textDark:'#ECF5EF', textMid:'#B2C5B8', textLight:'#82988A',
  border:'#30463A', borderStrong:'#426650', good:'#58C58B',
  gradientPrimary:['#16784B','#247F70'], gradientHero:['#142E21','#1A6543','#1C7162'],
  gradientSoft:['#1B3025','#101B16'],
};
export const Colors = light;
export const getPalette = mode => mode === 'dark' ? dark : light;
export const alertColor = (level, mode='light') => {
  const d = mode === 'dark';
  return ({danger:d?'#492522':'#FADBD8',warning:d?'#49331F':'#FAE5D3',caution:d?'#443B1D':'#FCF3CF',good:d?'#1D422E':'#D5F5E3',info:d?'#1D3548':'#D6EAF8'}[level] || (d?'#26372D':'#FFFFFF'));
};
export const alertTextColor = (level, mode='light') => {
  const c=getPalette(mode);
  return ({danger:c.danger,warning:c.warning,caution:c.caution,good:c.good,info:c.info}[level] || c.textDark);
};
const ThemeContext=createContext({theme:'light',setTheme:()=>{},Colors:light});
export function ThemeProvider({children}) {
  const [theme,setThemeState]=useState('light');
  useEffect(()=>{AsyncStorage.getItem('app_theme').then(v=>{if(v==='dark'||v==='light')setThemeState(v)}).catch(()=>{});},[]);
  const setTheme=async value=>{setThemeState(value);try{await AsyncStorage.setItem('app_theme',value)}catch{}};
  const value=useMemo(()=>({theme,setTheme,Colors:getPalette(theme)}),[theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme=()=>useContext(ThemeContext);
