import React from 'react';
import {View,Text,StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {alertColor,alertTextColor,useTheme} from '../theme/colors';
const LABELS={danger:'CRITICAL ALERT',warning:'WEATHER WARNING',caution:'TAKE CARE',good:'FARM CONDITIONS LOOK GOOD',info:'FARM UPDATE'};
const ICONS={danger:'alert-circle',warning:'warning',caution:'information-circle',good:'checkmark-circle',info:'information-circle'};
export default function AlertCard({level='info',action,detail}) {
 const {theme,Colors:c}=useTheme(); const bg=alertColor(level,theme),fg=alertTextColor(level,theme);
 return <View style={[s.card,{backgroundColor:bg,borderColor:c.border}]}>
  <View style={s.top}><View style={[s.icon,{backgroundColor:fg+'20'}]}><Ionicons name={ICONS[level]||ICONS.info} size={21} color={fg}/></View><Text style={[s.label,{color:fg}]}>{LABELS[level]||LABELS.info}</Text></View>
  <Text style={[s.action,{color:c.textDark}]}>{action||'Check local conditions before farm activities.'}</Text>
  {!!detail&&<Text style={[s.detail,{color:c.textMid}]}>{detail}</Text>}
 </View>;
}
const s=StyleSheet.create({card:{borderRadius:20,padding:17,borderWidth:1},top:{flexDirection:'row',alignItems:'center',marginBottom:10},icon:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center',marginRight:10},label:{fontSize:10,fontWeight:'900',letterSpacing:1},action:{fontSize:16,fontWeight:'800',lineHeight:23},detail:{fontSize:13,lineHeight:20,marginTop:6}});
