import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView, { type WebViewNavigation } from 'react-native-webview';
import { useColors } from '@/hooks/useColors';
import { type LegadoProfile, useLegado } from '@/context/LegadoContext';

const NativeWebView = WebView as React.ComponentType<any>;

type ViewName = 'home' | 'sites' | 'player' | 'browser' | 'profile';

type AnimeSite = {
  id: string;
  name: string;
  hostname: string;
  url: string;
  description: string;
  accent: string;
};

const SITES: AnimeSite[] = [
  {
    id: 'pluma',
    name: 'Pluma Comics',
    hostname: 'plumacomics.cloud',
    url: 'https://plumacomics.cloud/',
    description: 'Mangás e novidades para acompanhar no seu ritmo.',
    accent: '#A98CFF',
  },
  {
    id: 'animefire',
    name: 'AnimeFire',
    hostname: 'animefire.io',
    url: 'https://animefire.io/',
    description: 'Catálogo amplo para encontrar seu próximo anime.',
    accent: '#21D4C2',
  },
  {
    id: 'animesonline',
    name: 'Animes Online',
    hostname: 'animesonlinecc.to',
    url: 'https://animesonlinecc.to/',
    description: 'Episódios online com acesso rápido e direto.',
    accent: '#FFB86B',
  },
];

const BLOCKED_URL_PATTERNS = [
  'doubleclick',
  'googlesyndication',
  'googleadservices',
  'adservice',
  'popunder',
  'popads',
  'propellerads',
  'onclickads',
  'redirect',
  'adsterra',
  'trafficjunky',
  'exoclick',
];

const injectedProtectionScript = `
  (function() {
    var blocked = /doubleclick|googlesyndication|googleadservices|adservice|popunder|popads|propellerads|onclickads|redirect|adsterra|trafficjunky|exoclick/i;
    var hideSelectors = '[id*="ad" i], [class*="ad-" i], [class*="ads" i], [class*="popup" i], [class*="popunder" i], iframe[src*="ad" i]';
    var originalOpen = window.open;
    window.open = function() { return null; };
    var originalAssign = window.location.assign.bind(window.location);
    window.location.assign = function(url) {
      if (typeof url === 'string' && blocked.test(url)) return;
      originalAssign(url);
    };
    document.addEventListener('click', function(event) {
      var target = event.target;
      while (target && target.tagName !== 'A') target = target.parentElement;
      if (target && target.href && blocked.test(target.href)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
    function clean() {
      document.querySelectorAll(hideSelectors).forEach(function(node) {
        if (node instanceof HTMLElement) node.style.setProperty('display', 'none', 'important');
      });
    }
    clean();
    new MutationObserver(clean).observe(document.documentElement, { childList: true, subtree: true });
  })();
  true;
`;

function isBlockedUrl(url: string) {
  const lowerUrl = url.toLowerCase();
  return BLOCKED_URL_PATTERNS.some((pattern) => lowerUrl.includes(pattern));
}

function getHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isAllowedSiteUrl(url: string) {
  const host = getHost(url);
  return SITES.some((site) => host === site.hostname || host.endsWith(`.${site.hostname}`));
}

function Avatar({
  profile,
  size = 44,
  colors,
}: {
  profile: LegadoProfile | null;
  size?: number;
  colors: ReturnType<typeof useColors>;
}) {
  if (profile?.photoUri) {
    return <Image source={{ uri: profile.photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.secondary }]}>
      <Text style={[styles.avatarInitial, { color: colors.primary }]}>{profile?.name?.charAt(0).toUpperCase() || 'L'}</Text>
    </View>
  );
}

function ProfileGate() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveProfile } = useLegado();
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const gateStyles = useMemo(() => createStyles(colors), [colors]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher seu avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setPhotoUri(result.assets[0]?.uri);
  };

  const enterApp = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Como quer ser chamado?', 'Digite seu nome para personalizar o Legado.');
      return;
    }
    setIsSaving(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveProfile({ name: trimmedName, photoUri, createdAt: new Date().toISOString() });
    setIsSaving(false);
  };

  return (
    <View style={[gateStyles.screen, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 18 }]}>
      <StatusBar style="light" />
      <View style={gateStyles.gateTop}>
        <View style={gateStyles.logoMark}>
          <Image source={require('@/assets/images/legado-generated-icon.png')} style={gateStyles.logoImage} contentFit="cover" />
        </View>
        <Text style={gateStyles.eyebrow}>SEU HUB DE ANIMES</Text>
      </View>
      <View style={gateStyles.gateContent}>
        <Text style={gateStyles.gateTitle}>Seu próximo mundo{'\n'}começa aqui.</Text>
        <Text style={gateStyles.gateSubtitle}>Uma experiência única para assistir, explorar e voltar sempre de onde parou.</Text>
        <Pressable onPress={pickPhoto} style={({ pressed }) => [gateStyles.profilePicker, pressed && styles.pressed]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={gateStyles.profileImage} />
          ) : (
            <>
              <Feather name="camera" size={24} color={colors.primary} />
              <Text style={gateStyles.profilePickerText}>Adicionar foto</Text>
            </>
          )}
          <View style={gateStyles.plusButton}><Feather name="plus" size={15} color={colors.primaryForeground} /></View>
        </Pressable>
        <Text style={gateStyles.fieldLabel}>COMO DEVEMOS TE CHAMAR?</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          returnKeyType="done"
          style={gateStyles.nameInput}
          onSubmitEditing={enterApp}
        />
      </View>
      <View>
        <Pressable testID="enter-legado" onPress={enterApp} disabled={isSaving} style={({ pressed }) => [gateStyles.primaryButton, pressed && styles.pressed, isSaving && styles.disabled]}>
          {isSaving ? <ActivityIndicator color={colors.primaryForeground} /> : <><Text style={gateStyles.primaryButtonText}>Entrar no Legado</Text><Feather name="arrow-right" size={20} color={colors.primaryForeground} /></>}
        </Pressable>
        <Text style={gateStyles.privacyNote}><Feather name="lock" size={12} color={colors.mutedForeground} /> Seu perfil fica salvo somente neste aparelho.</Text>
      </View>
    </View>
  );
}

function SiteCard({ site, onPress, colors }: { site: AnimeSite; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable testID={`site-${site.id}`} onPress={onPress} style={({ pressed }) => [styles.siteCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}>
      <View style={[styles.siteIcon, { backgroundColor: site.accent }]}>
        <Feather name={site.id === 'pluma' ? 'book-open' : site.id === 'animefire' ? 'zap' : 'play-circle'} size={21} color={colors.primaryForeground} />
      </View>
      <View style={styles.siteCardCopy}>
        <Text style={[styles.siteName, { color: colors.foreground }]}>{site.name}</Text>
        <Text style={[styles.siteDescription, { color: colors.mutedForeground }]} numberOfLines={2}>{site.description}</Text>
        <View style={styles.siteLinkRow}><View style={[styles.onlineDot, { backgroundColor: colors.accent }]} /><Text style={[styles.siteHostname, { color: colors.mutedForeground }]}>{site.hostname}</Text></View>
      </View>
      <Feather name="arrow-up-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function HomeView({ profile, onOpenSite, onNavigate, colors }: { profile: LegadoProfile; onOpenSite: (site: AnimeSite) => void; onNavigate: (view: ViewName) => void; colors: ReturnType<typeof useColors> }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>BEM-VINDO DE VOLTA</Text>
          <Text style={[styles.greeting, { color: colors.foreground }]}>{profile.name}</Text>
        </View>
        <Pressable testID="open-profile" onPress={() => onNavigate('profile')}><Avatar profile={profile} colors={colors} /></Pressable>
      </View>
      <LinearGradient colors={[colors.secondary, colors.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroCopy}>
          <View style={styles.heroTag}><View style={[styles.heroDot, { backgroundColor: colors.accent }]} /><Text style={[styles.heroTagText, { color: colors.accent }]}>PROTEÇÃO ATIVA</Text></View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>O melhor do{'\n'}anime, sem distrações.</Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>Acesse suas fontes favoritas em um só lugar, com uma navegação mais limpa.</Text>
        </View>
        <View style={styles.heroArt}><Feather name="play" size={28} color={colors.primaryForeground} /></View>
      </LinearGradient>
      <View style={styles.sectionHeader}><View><Text style={[styles.sectionKicker, { color: colors.primary }]}>SUAS FONTES</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Escolha onde assistir</Text></View><Pressable onPress={() => onNavigate('sites')}><Text style={[styles.seeAll, { color: colors.primary }]}>Ver todas</Text></Pressable></View>
      <View style={styles.siteList}>{SITES.map((site) => <SiteCard key={site.id} site={site} onPress={() => onOpenSite(site)} colors={colors} />)}</View>
      <Pressable onPress={() => onNavigate('player')} style={({ pressed }) => [styles.playerPromo, { backgroundColor: colors.secondary, borderColor: colors.border }, pressed && styles.pressed]}>
        <View style={[styles.playerPromoIcon, { backgroundColor: colors.accent }]}><Feather name="play" size={19} color={colors.accentForeground} /></View>
        <View style={styles.playerPromoCopy}><Text style={[styles.playerPromoTitle, { color: colors.foreground }]}>Player Legado</Text><Text style={[styles.playerPromoText, { color: colors.mutedForeground }]}>Assista links diretos com seus próprios controles.</Text></View>
        <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
      </Pressable>
    </ScrollView>
  );
}

function SitesView({ onOpenSite, colors }: { onOpenSite: (site: AnimeSite) => void; colors: ReturnType<typeof useColors> }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.pageHeading}><Text style={[styles.sectionKicker, { color: colors.primary }]}>CATÁLOGO</Text><Text style={[styles.pageTitle, { color: colors.foreground }]}>Suas fontes</Text><Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Todos os sites ficam dentro do Legado, com proteção contra distrações.</Text></View>
      <View style={[styles.protectionBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}><View style={[styles.protectionIcon, { backgroundColor: colors.accent }]}><Feather name="shield" size={19} color={colors.accentForeground} /></View><View style={styles.protectionCopy}><Text style={[styles.protectionTitle, { color: colors.foreground }]}>Bloqueio rigoroso ligado</Text><Text style={[styles.protectionText, { color: colors.mutedForeground }]}>Pop-ups, anúncios conhecidos e redirecionamentos suspeitos são filtrados.</Text></View></View>
      <View style={styles.siteList}>{SITES.map((site) => <SiteCard key={site.id} site={site} onPress={() => onOpenSite(site)} colors={colors} />)}</View>
    </ScrollView>
  );
}

function PlayerView({ initialUrl, colors }: { initialUrl: string; colors: ReturnType<typeof useColors> }) {
  const [videoUrl, setVideoUrl] = useState(initialUrl);
  const [activeUrl, setActiveUrl] = useState(initialUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const escapedUrl = activeUrl.replace(/"/g, '&quot;');
  const playerHtml = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>html,body{margin:0;background:#0B0914;height:100%;overflow:hidden}video{width:100%;height:100%;background:#0B0914;object-fit:contain}</style></head><body><video controls playsinline ${isPlaying ? 'autoplay' : ''} src="${escapedUrl}"></video></body></html>`;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.pageHeading}><Text style={[styles.sectionKicker, { color: colors.accent }]}>REPRODUÇÃO</Text><Text style={[styles.pageTitle, { color: colors.foreground }]}>Player Legado</Text><Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Cole um link direto de vídeo compatível para usar uma reprodução limpa, sem controles de terceiros.</Text></View>
      <View style={[styles.playerFrame, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {activeUrl ? <WebView source={{ html: playerHtml }} style={styles.webview} allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} /> : <View style={styles.playerEmpty}><View style={[styles.emptyPlay, { backgroundColor: colors.secondary }]}><Feather name="play" size={30} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Pronto para dar play</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Insira um link de vídeo abaixo.</Text></View>}
      </View>
      <View style={styles.playerInputRow}><TextInput value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://seu-video.mp4" placeholderTextColor={colors.mutedForeground} style={[styles.urlInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} /><Pressable testID="play-direct-video" onPress={() => { setActiveUrl(videoUrl.trim()); setIsPlaying(true); }} style={({ pressed }) => [styles.playButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Feather name="play" size={19} color={colors.primaryForeground} /></Pressable></View>
      <View style={[styles.playerNote, { backgroundColor: colors.secondary }]}><Feather name="info" size={16} color={colors.primary} /><Text style={[styles.playerNoteText, { color: colors.mutedForeground }]}>O player funciona com links diretos de vídeo. Cada site pode ter suas próprias regras de reprodução.</Text></View>
    </ScrollView>
  );
}

function BrowserView({ site, onBack, onPlayer, colors }: { site: AnimeSite; onBack: () => void; onPlayer: () => void; colors: ReturnType<typeof useColors> }) {
  const webViewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const handleNavigation = (request: WebViewNavigation) => {
    if (isBlockedUrl(request.url)) {
      setIsBlocked(true);
      return false;
    }
    return true;
  };

  return (
    <View style={styles.browserShell}>
      <View style={[styles.browserHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable testID="browser-back" onPress={onBack} style={styles.iconButton}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable>
        <View style={styles.browserTitleWrap}><View style={[styles.browserStatusDot, { backgroundColor: colors.accent }]} /><Text style={[styles.browserTitle, { color: colors.foreground }]} numberOfLines={1}>{site.name}</Text><Text style={[styles.browserDomain, { color: colors.mutedForeground }]} numberOfLines={1}>{site.hostname}</Text></View>
        <Pressable testID="browser-player" onPress={onPlayer} style={styles.iconButton}><Feather name="play-circle" size={21} color={colors.primary} /></Pressable>
        <Pressable testID="browser-reload" onPress={() => webViewRef.current?.reload()} style={styles.iconButton}><Feather name="refresh-cw" size={19} color={colors.mutedForeground} /></Pressable>
      </View>
      <View style={styles.browserProtection}><Feather name="shield" size={14} color={colors.accent} /><Text style={[styles.browserProtectionText, { color: colors.accent }]}>PROTEÇÃO RIGOROSA ATIVA</Text>{isLoading && <ActivityIndicator size="small" color={colors.primary} style={styles.browserLoader} />}</View>
      <NativeWebView
        ref={webViewRef}
        source={{ uri: site.url }}
        style={styles.webview}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onShouldStartLoadWithRequest={handleNavigation}
        injectedJavaScriptBeforeContentLoaded={injectedProtectionScript}
        injectedJavaScript={injectedProtectionScript}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        onError={() => setIsLoading(false)}
      />
      {isBlocked && <View style={[styles.blockToast, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="shield-off" size={16} color={colors.accent} /><Text style={[styles.blockToastText, { color: colors.foreground }]}>Redirecionamento bloqueado</Text><Pressable onPress={() => setIsBlocked(false)}><Feather name="x" size={17} color={colors.mutedForeground} /></Pressable></View>}
    </View>
  );
}

function ProfileView({ profile, onSave, onLogout, colors }: { profile: LegadoProfile; onSave: (profile: LegadoProfile) => Promise<void>; onLogout: () => void; colors: ReturnType<typeof useColors> }) {
  const profileStyles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState(profile.name);
  const [photoUri, setPhotoUri] = useState(profile.photoUri);
  const [isPicking, setIsPicking] = useState(false);
  const pickPhoto = async () => {
    setIsPicking(true);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted) {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (!result.canceled) setPhotoUri(result.assets[0]?.uri);
    }
    setIsPicking(false);
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeading}><Text style={[styles.sectionKicker, { color: colors.primary }]}>CONTA LOCAL</Text><Text style={[styles.pageTitle, { color: colors.foreground }]}>Seu perfil</Text><Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Personalize seu acesso sem criar uma conta externa.</Text></View>
        <Pressable onPress={pickPhoto} style={({ pressed }) => [styles.largeAvatarWrap, pressed && styles.pressed]}>{photoUri ? <Image source={{ uri: photoUri }} style={styles.largeAvatar} /> : <Avatar profile={profile} size={92} colors={colors} />}<View style={[styles.avatarEdit, { backgroundColor: colors.primary }]}>{isPicking ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Feather name="camera" size={15} color={colors.primaryForeground} />}</View></Pressable>
        <Text style={[profileStyles.fieldLabel, { color: colors.mutedForeground }]}>NOME DE EXIBIÇÃO</Text><TextInput value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={colors.mutedForeground} style={[profileStyles.nameInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
        <Pressable testID="save-profile" onPress={() => { if (name.trim()) onSave({ ...profile, name: name.trim(), photoUri }); }} style={({ pressed }) => [profileStyles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[profileStyles.primaryButtonText, { color: colors.primaryForeground }]}>Salvar alterações</Text><Feather name="check" size={19} color={colors.primaryForeground} /></Pressable>
        <Pressable testID="logout" onPress={() => Alert.alert('Sair deste aparelho?', 'Você precisará configurar o perfil novamente para entrar.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: onLogout }])} style={styles.logoutButton}><Feather name="log-out" size={17} color={colors.destructive} /><Text style={[styles.logoutText, { color: colors.destructive }]}>Limpar perfil e sair</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BottomNav({ currentView, onNavigate, colors }: { currentView: ViewName; onNavigate: (view: ViewName) => void; colors: ReturnType<typeof useColors> }) {
  const items: { view: ViewName; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { view: 'home', label: 'Início', icon: 'home' },
    { view: 'sites', label: 'Fontes', icon: 'grid' },
    { view: 'player', label: 'Player', icon: 'play-circle' },
    { view: 'profile', label: 'Perfil', icon: 'user' },
  ];
  return <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>{items.map((item) => { const active = currentView === item.view; return <Pressable key={item.view} testID={`nav-${item.view}`} onPress={() => onNavigate(item.view)} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}><Feather name={item.icon} size={20} color={active ? colors.primary : colors.mutedForeground} /><Text style={[styles.navLabel, { color: active ? colors.primary : colors.mutedForeground }]}>{item.label}</Text>{active && <View style={[styles.navPill, { backgroundColor: colors.primary }]} />}</Pressable>; })}</View>;
}

function AppShell({ profile }: { profile: LegadoProfile }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile, clearProfile } = useLegado();
  const [currentView, setCurrentView] = useState<ViewName>('home');
  const [selectedSite, setSelectedSite] = useState<AnimeSite | null>(null);
  const [playerUrl, setPlayerUrl] = useState('');
  const appStyles = useMemo(() => createStyles(colors), [colors]);

  const openSite = (site: AnimeSite) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSite(site);
    setCurrentView('browser');
  };
  const navigate = (view: ViewName) => {
    Haptics.selectionAsync();
    setCurrentView(view);
  };

  if (currentView === 'browser' && selectedSite) {
    return <View style={[appStyles.screen, { paddingTop: insets.top }]}><BrowserView site={selectedSite} onBack={() => setCurrentView('home')} onPlayer={() => { setPlayerUrl(''); setCurrentView('player'); }} colors={colors} /></View>;
  }

  return (
    <View style={[appStyles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.shellTopLine}><View style={[styles.brandDot, { backgroundColor: colors.primary }]} /><Text style={[styles.brandName, { color: colors.foreground }]}>LEGADO</Text><View style={styles.topLineSpacer} /><View style={[styles.secureLabel, { backgroundColor: colors.secondary }]}><Feather name="shield" size={12} color={colors.accent} /><Text style={[styles.secureText, { color: colors.accent }]}>SEGURO</Text></View></View>
      <View style={styles.shellBody}>
        {currentView === 'home' && <HomeView profile={profile} onOpenSite={openSite} onNavigate={navigate} colors={colors} />}
        {currentView === 'sites' && <SitesView onOpenSite={openSite} colors={colors} />}
        {currentView === 'player' && <PlayerView initialUrl={playerUrl} colors={colors} />}
        {currentView === 'profile' && <ProfileView profile={profile} onSave={async (nextProfile) => { await updateProfile(nextProfile); setCurrentView('home'); }} onLogout={() => clearProfile()} colors={colors} />}
      </View>
      <View style={{ paddingBottom: Math.max(insets.bottom, 10) }}><BottomNav currentView={currentView} onNavigate={navigate} colors={colors} /></View>
    </View>
  );
}

export default function Index() {
  const { profile, isHydrating } = useLegado();
  if (isHydrating) return <View style={styles.loadingScreen}><ActivityIndicator size="large" color="#A98CFF" /></View>;
  return profile ? <AppShell profile={profile} /> : <ProfileGate />;
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    gateTop: { alignItems: 'center', gap: 11 },
    gateContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 27 },
    logoMark: { width: 78, height: 78, borderRadius: 24, overflow: 'hidden', marginBottom: 3 },
    logoImage: { width: '100%', height: '100%' },
    eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2.2, color: colors.mutedForeground },
    gateTitle: { fontFamily: 'Inter_700Bold', fontSize: 37, lineHeight: 43, letterSpacing: -1.3, textAlign: 'center', color: colors.foreground, marginBottom: 13 },
    gateSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23, textAlign: 'center', color: colors.mutedForeground, maxWidth: 320 },
    profilePicker: { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 27, marginBottom: 26, overflow: 'visible' },
    profileImage: { width: 108, height: 108, borderRadius: 54 },
    plusButton: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', position: 'absolute', right: -1, bottom: 3, borderWidth: 3, borderColor: colors.background },
    profilePickerText: { fontFamily: 'Inter_500Medium', color: colors.primary, fontSize: 12, marginTop: 5 },
    fieldLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, alignSelf: 'stretch', color: colors.mutedForeground, marginBottom: 9 },
    nameInput: { height: 53, borderRadius: 14, paddingHorizontal: 16, fontFamily: 'Inter_500Medium', fontSize: 16, alignSelf: 'stretch', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.foreground },
    primaryButton: { height: 55, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
    primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.primaryForeground },
    privacyNote: { textAlign: 'center', fontFamily: 'Inter_400Regular', color: colors.mutedForeground, fontSize: 11, marginTop: 13 },
  });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0914' },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.65 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  scrollContent: { paddingHorizontal: 19, paddingTop: 7, paddingBottom: 28 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  miniLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.5 },
  hero: { minHeight: 218, borderRadius: 24, padding: 22, justifyContent: 'space-between', overflow: 'hidden', marginBottom: 27 },
  heroCopy: { maxWidth: '78%' },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 18 },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroTagText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.3 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 32, letterSpacing: -0.9, marginBottom: 11 },
  heroSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  heroArt: { position: 'absolute', right: 21, bottom: 20, width: 48, height: 48, borderRadius: 16, backgroundColor: '#A98CFF', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-9deg' }] },
  heroGlow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, right: -58, top: -55, backgroundColor: 'rgba(169,140,255,0.14)' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 13 },
  sectionKicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.3 },
  seeAll: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 2 },
  siteList: { gap: 10 },
  siteCard: { minHeight: 105, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  siteIcon: { width: 47, height: 47, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  siteCardCopy: { flex: 1 },
  siteName: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 3 },
  siteDescription: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginBottom: 7 },
  siteLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 5, height: 5, borderRadius: 3 },
  siteHostname: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  playerPromo: { borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 14, marginTop: 22, gap: 11 },
  playerPromoIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  playerPromoCopy: { flex: 1 },
  playerPromoTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 3 },
  playerPromoText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  shellTopLine: { height: 55, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  brandName: { fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 2.6 },
  topLineSpacer: { flex: 1 },
  secureLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  secureText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  shellBody: { flex: 1 },
  bottomNav: { height: 67, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 5 },
  navItem: { minWidth: 65, height: 58, alignItems: 'center', justifyContent: 'center', gap: 4 },
  navLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  navPill: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 1 },
  pageHeading: { paddingTop: 12, marginBottom: 21 },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8, marginBottom: 7 },
  pageSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  protectionBanner: { flexDirection: 'row', borderRadius: 17, borderWidth: 1, padding: 13, alignItems: 'center', gap: 11, marginBottom: 18 },
  protectionIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  protectionCopy: { flex: 1 },
  protectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, marginBottom: 3 },
  protectionText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  browserShell: { flex: 1 },
  browserHeader: { minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 1 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  browserTitleWrap: { flex: 1, paddingHorizontal: 5 },
  browserStatusDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, left: 5, top: 7 },
  browserTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, paddingLeft: 14 },
  browserDomain: { fontFamily: 'Inter_400Regular', fontSize: 10, paddingLeft: 14, marginTop: 2 },
  browserProtection: { height: 29, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  browserProtectionText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  browserLoader: { marginLeft: 4 },
  webview: { flex: 1, backgroundColor: '#0B0914' },
  blockToast: { position: 'absolute', bottom: 20, left: 15, right: 15, borderRadius: 13, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  blockToastText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  playerFrame: { height: 216, borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 13 },
  playerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyPlay: { width: 68, height: 68, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 5 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  playerInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  urlInput: { flex: 1, minHeight: 51, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, fontFamily: 'Inter_400Regular', fontSize: 12 },
  playButton: { width: 52, minHeight: 51, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  playerNote: { padding: 13, borderRadius: 14, flexDirection: 'row', gap: 8 },
  playerNoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  largeAvatarWrap: { alignSelf: 'center', marginVertical: 10, position: 'relative' },
  largeAvatar: { width: 92, height: 92, borderRadius: 46 },
  avatarEdit: { position: 'absolute', right: -2, bottom: 1, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#0B0914' },
  logoutButton: { height: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 12 },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});