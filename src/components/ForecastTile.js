import React,{useState} from 'react';
import {View,Text,TouchableOpacity,StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTheme,alertColor,alertTextColor} from '../theme/colors';
export function StatChip({icon,value,label}) {
 const {Colors:c}=useTheme();
 return <View style={[s.chip,{backgroundColor:c.surfaceSolid,borderColor:c.border}]}><Ionicons name={icon} size={17} color={c.primary}/><Text style={[s.chipValue,{color:c.textDark}]}>{value}</Text><Text style={[s.chipLabel,{color:c.textLight}]}>{label}</Text></View>;
}
function dayLabel(date,index){if(index===0)return'Today';if(index===1)return'Tomorrow';try{const [y,m,d]=date.split('-').map(Number);return['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(y,m-1,d).getDay()]}catch{return date||'Day'}}
export function ForecastDayTile({day,index}) {
 const [expanded,setExpanded]=useState(false);const {Colors:c,theme}=useTheme();
 const level=(day.alert_level||'info').toString().split('.').pop();const fg=alertTextColor(level,theme);
 const icon=(String(day.condition||'').toLowerCase().includes('rain')?'rainy-outline':String(day.condition||'').toLowerCase().includes('cloud')?'cloud-outline':'sunny-outline');
 return <TouchableOpacity activeOpacity={0.85} onPress={()=>setExpanded(v=>!v)} style={[s.dayCard,{backgroundColor:c.surfaceSolid,borderColor:c.border}]}>
  <View style={s.row}>
   <View style={[s.weatherIcon,{backgroundColor:c.primaryLight}]}><Ionicons name={icon} size={23} color={c.primary}/></View>
   <View style={{flex:1}}><Text style={[s.dayName,{color:c.textDark}]}>{dayLabel(day.date,index)}</Text><Text style={[s.condition,{color:c.textMid}]} numberOfLines={1}>{day.condition||'Forecast'}</Text></View>
   <View style={{alignItems:'flex-end',marginRight:8}}><Text style={[s.temp,{color:c.textDark}]}>{Math.round(day.temp_max_c??0)}°</Text><Text style={[s.low,{color:c.textLight}]}>{Math.round(day.temp_min_c??0)}° low</Text></View>
   <Ionicons name={expanded?'chevron-up':'chevron-down'} size={18} color={c.textLight}/>
  </View>
  {expanded&&<View style={[s.details,{borderTopColor:c.border}]}>
   <View style={[s.alertTag,{backgroundColor:alertColor(level,theme)}]}><View style={[s.dot,{backgroundColor:fg}]}/><Text style={[s.alertText,{color:fg}]}>{level.toUpperCase()} · FARM ADVISORY</Text></View>
   {!!day.action&&<Text style={[s.action,{color:c.textDark}]}>{day.action}</Text>}
   {!!day.detail&&<Text style={[s.detailText,{color:c.textMid}]}>{day.detail}</Text>}
   <View style={s.stats}><StatChip icon="rainy-outline" value={`${Math.round(day.rain_prob_pct??0)}%`} label="Rain chance"/><StatChip icon="speedometer-outline" value={`${Math.round(day.wind_speed_kmh??0)}`} label="Wind km/h"/><StatChip icon="thermometer-outline" value={`${Math.round(day.temp_min_c??0)}–${Math.round(day.temp_max_c??0)}°`} label="Temperature"/></View>
  </View>}
 </TouchableOpacity>;
}
const s=StyleSheet.create({dayCard:{borderRadius:19,borderWidth:1,padding:14,marginBottom:11},row:{flexDirection:'row',alignItems:'center'},weatherIcon:{width:46,height:46,borderRadius:15,alignItems:'center',justifyContent:'center',marginRight:12},dayName:{fontSize:15,fontWeight:'900'},condition:{fontSize:12,marginTop:3},temp:{fontSize:23,fontWeight:'900'},low:{fontSize:10,marginTop:1},details:{borderTopWidth:1,marginTop:14,paddingTop:13},alertTag:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:6,borderRadius:20,marginBottom:10},dot:{width:7,height:7,borderRadius:4,marginRight:6},alertText:{fontSize:9,fontWeight:'900',letterSpacing:.6},action:{fontSize:14,fontWeight:'800',lineHeight:21},detailText:{fontSize:12,lineHeight:18,marginTop:5},stats:{flexDirection:'row',gap:7,marginTop:12},chip:{flex:1,minWidth:0,borderWidth:1,borderRadius:12,paddingVertical:10,alignItems:'center',gap:4},chipValue:{fontSize:12,fontWeight:'900'},chipLabel:{fontSize:8,fontWeight:'700',textAlign:'center'}});
