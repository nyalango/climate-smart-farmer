import React,{useState,useEffect} from 'react';
import {View,Text,TouchableOpacity,ScrollView,StyleSheet,ActivityIndicator} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '../theme/colors';
import {LANGUAGES,APP_NAME} from '../config/api';
import {getLocations,loadPrefs,savePrefs} from '../services/weatherService';
import {getFarmerProfile} from '../services/authService';
export default function SettingsScreen({onSignOut}) {
 const {Colors:c,theme,setTheme}=useTheme();
 const [locations,setLocations]=useState([]),[selectedLoc,setSelectedLoc]=useState('kampala'),[selectedLang,setSelectedLang]=useState('en');
 const [saved,setSaved]=useState(false),[loading,setLoading]=useState(true),[farmer,setFarmer]=useState(null);
 useEffect(()=>{(async()=>{try{const [prefs,locs,profile]=await Promise.all([loadPrefs(),getLocations(),getFarmerProfile()]);setFarmer(profile);setSelectedLoc(prefs.location);setSelectedLang(prefs.lang);setLocations(locs);}finally{setLoading(false);}})();},[]);
 const save=async()=>{await savePrefs(selectedLoc,selectedLang);setSaved(true);setTimeout(()=>setSaved(false),1800);};
 const st=styles(c);
 if(loading)return <View style={[st.center,{backgroundColor:c.background}]}><ActivityIndicator color={c.primary}/></View>;
 return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{padding:18,paddingBottom:40}}>
  <Text style={[st.brand,{color:c.primary}]}>{APP_NAME.toUpperCase()}</Text>
  {!!farmer&&<View style={[st.account,{backgroundColor:c.surfaceSolid,borderColor:c.border}]}><Ionicons name="person-circle-outline" size={39} color={c.primary}/><View style={{flex:1,marginLeft:11}}><Text style={[st.name,{color:c.textDark}]}>{farmer.name}</Text><Text style={[st.email,{color:c.textMid}]}>{farmer.email}</Text></View><Ionicons name="checkmark-circle" size={19} color={c.good}/></View>}
  <Text style={[st.heading,{color:c.textDark}]}>Appearance</Text><Text style={[st.description,{color:c.textMid}]}>Choose how Climate Smart Farmer looks on this device.</Text>
  <View style={[st.themeBox,{backgroundColor:c.surfaceSolid,borderColor:c.border}]}>
   {[['light','sunny-outline','Light'],['dark','moon-outline','Dark']].map(([value,icon,label])=><TouchableOpacity key={value} onPress={()=>setTheme(value)} style={[st.themeOption,{borderColor:theme===value?c.primary:c.border,backgroundColor:theme===value?c.primaryLight:'transparent'}]}><Ionicons name={icon} size={20} color={theme===value?c.primary:c.textMid}/><Text style={{color:theme===value?c.primary:c.textDark,fontWeight:'800',marginLeft:8}}>{label}</Text>{theme===value&&<Ionicons name="checkmark-circle" size={18} color={c.primary} style={{marginLeft:'auto'}}/>}</TouchableOpacity>)}
  </View>
  <Text style={[st.heading,{color:c.textDark,marginTop:25}]}>Your farm location</Text><Text style={[st.description,{color:c.textMid}]}>Select the town closest to your farm.</Text>
  <View style={st.pills}>{locations.map(loc=><TouchableOpacity key={loc.key} onPress={()=>{setSelectedLoc(loc.key);setSelectedLang(loc.default_lang||'en');}} style={[st.pill,{borderColor:selectedLoc===loc.key?c.primary:c.border,backgroundColor:selectedLoc===loc.key?c.primary:'transparent'}]}><Text style={{color:selectedLoc===loc.key?'#fff':c.textMid,fontWeight:selectedLoc===loc.key?'800':'600'}}>{loc.name}</Text></TouchableOpacity>)}</View>
  <Text style={[st.heading,{color:c.textDark,marginTop:24}]}>Language</Text><Text style={[st.description,{color:c.textMid}]}>Choose the language for supported forecasts and alerts.</Text>
  <View style={st.pills}>{LANGUAGES.map(l=><TouchableOpacity key={l.code} onPress={()=>setSelectedLang(l.code)} style={[st.pill,{borderColor:selectedLang===l.code?c.primary:c.border,backgroundColor:selectedLang===l.code?c.primary:'transparent'}]}><Text style={{color:selectedLang===l.code?'#fff':c.textMid,fontWeight:selectedLang===l.code?'800':'600'}}>{l.native}</Text></TouchableOpacity>)}</View>
  <TouchableOpacity onPress={save} activeOpacity={.85} style={st.save}><LinearGradient colors={saved?[c.good,c.good]:c.gradientPrimary} style={st.saveGrad}><Ionicons name={saved?'checkmark-circle':'save-outline'} size={18} color="#fff"/><Text style={st.saveText}>{saved?'Preferences saved':'Save preferences'}</Text></LinearGradient></TouchableOpacity>
  <TouchableOpacity style={[st.signout,{borderColor:c.danger}]} onPress={onSignOut}><Ionicons name="log-out-outline" size={18} color={c.danger}/><Text style={{color:c.danger,fontWeight:'800',marginLeft:8}}>Sign out</Text></TouchableOpacity>
 </ScrollView>;
}
const styles=c=>StyleSheet.create({center:{flex:1,justifyContent:'center',alignItems:'center'},brand:{fontSize:10,fontWeight:'900',letterSpacing:1.3,marginBottom:17},account:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:17,padding:14,marginBottom:25},name:{fontSize:15,fontWeight:'900'},email:{fontSize:12,marginTop:3},heading:{fontSize:17,fontWeight:'900',marginBottom:5},description:{fontSize:12,lineHeight:18,marginBottom:12},themeBox:{borderWidth:1,borderRadius:17,padding:9,gap:8},themeOption:{borderWidth:1,borderRadius:12,padding:13,flexDirection:'row',alignItems:'center'},pills:{flexDirection:'row',flexWrap:'wrap',gap:8},pill:{borderWidth:1,borderRadius:22,paddingHorizontal:13,paddingVertical:9},save:{borderRadius:15,overflow:'hidden',marginTop:28},saveGrad:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,padding:16},saveText:{color:'#fff',fontWeight:'900',fontSize:15},signout:{marginTop:17,borderWidth:1.3,borderRadius:14,padding:14,flexDirection:'row',justifyContent:'center',alignItems:'center'}});
