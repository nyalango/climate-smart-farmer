import React,{useState,useEffect} from 'react';
import {View,Text,ScrollView,RefreshControl,StyleSheet,ActivityIndicator,TouchableOpacity} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {ForecastDayTile} from '../components/ForecastTile';
import {useTheme,alertColor,alertTextColor} from '../theme/colors';
import {getWeekly,getLastError,getWeeklyWasCached} from '../services/weatherService';
export default function WeekScreen({route}) {
 const {Colors:c,theme}=useTheme();const {location='kampala',lang='en'}=route.params||{};
 const [forecast,setForecast]=useState(null),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[errorMsg,setErrorMsg]=useState('');
 const load=async(refresh=false)=>{if(refresh)setRefreshing(true);else setLoading(true);const data=await getWeekly(location,lang);setForecast(data);setOffline(!!data && getWeeklyWasCached());setErrorMsg(data?'':getLastError());setLoading(false);setRefreshing(false);};
 useEffect(()=>{load();},[]);
 const st=styles(c);
 if(loading)return <View style={[st.center,{backgroundColor:c.background}]}><ActivityIndicator size="large" color={c.primary}/><Text style={st.muted}>Loading 7-day forecast…</Text></View>;
 if(!forecast)return <View style={[st.center,{backgroundColor:c.background,padding:25}]}><Ionicons name="cloud-offline-outline" size={48} color={c.textLight}/><Text style={st.errorTitle}>Could not load forecast</Text><Text style={st.muted}>{errorMsg||'Check your connection and try again.'}</Text><TouchableOpacity style={st.retry} onPress={()=>load()}><Text style={{color:'#fff',fontWeight:'800'}}>Try again</Text></TouchableOpacity></View>;
 const level=(forecast.highest_alert||'info').toString().split('.').pop(),fg=alertTextColor(level,theme);
 return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{padding:16,paddingBottom:35}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(true)} colors={[c.primary]} tintColor={c.primary}/>}>
  {offline&&<View style={[st.offline,{backgroundColor:c.primaryLight,borderColor:c.border}]}><Ionicons name="cloud-offline-outline" size={16} color={c.warning}/><Text style={{color:c.warning,fontSize:12,fontWeight:'700',marginLeft:7}}>Offline · showing saved 7-day forecast</Text></View>}
  <View style={[st.intro,{backgroundColor:c.surfaceSolid,borderColor:c.border}]}><Text style={[st.kicker,{color:c.primary}]}>YOUR WEEK AHEAD</Text><Text style={[st.title,{color:c.textDark}]}>{forecast.location_name||location}</Text><Text style={[st.sub,{color:c.textMid}]}>Tap any day to open its farming guidance and weather details.</Text></View>
  <View style={[st.summary,{backgroundColor:alertColor(level,theme),borderColor:c.border}]}><Ionicons name="alert-circle-outline" size={20} color={fg}/><View style={{flex:1,marginLeft:9}}><Text style={[st.summaryTitle,{color:fg}]}>{level.toUpperCase()} · WEEKLY OUTLOOK</Text><Text style={[st.summarySub,{color:c.textMid}]}>Highest advisory level in this forecast</Text></View></View>
  {(forecast.days||[]).map((day,i)=><ForecastDayTile key={day.date||i} day={day} index={i}/>)}
 </ScrollView>;
}
const styles=c=>StyleSheet.create({center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},muted:{color:c.textMid,textAlign:'center',marginTop:12,lineHeight:20},errorTitle:{fontSize:18,fontWeight:'800',color:c.textDark,marginTop:12},retry:{backgroundColor:c.primary,paddingHorizontal:23,paddingVertical:12,borderRadius:12,marginTop:18},intro:{borderWidth:1,borderRadius:20,padding:18,marginBottom:13},kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.4},title:{fontSize:24,fontWeight:'900',marginTop:6,textTransform:'capitalize'},sub:{fontSize:12,lineHeight:18,marginTop:5},summary:{borderWidth:1,borderRadius:16,padding:13,flexDirection:'row',alignItems:'center',marginBottom:15},summaryTitle:{fontSize:11,fontWeight:'900',letterSpacing:.5},summarySub:{fontSize:10,marginTop:3},offline:{flexDirection:'row',alignItems:'center',padding:12,borderWidth:1,borderRadius:13,marginBottom:12}});
