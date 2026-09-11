import {
  Play,
  Video,
  Mic,
  Drama,
  Music,
  Trophy,
  RadioTower,
  RotateCcw,
  Search,
  Sun,
  Moon,
  Menu,
  Grid,
  FileText,
  Rss,
  LogOut,
  Plus,
  Globe,
  Eye,
  Trash2,
  Bell,
  Users,
  Calendar,
  Share2,
  BarChart,
  Folder,
  Settings,
  Tv,
  Headphones,
  Link,
  Image,
  Mail,
  MapPin,
  Phone,
  Lightbulb,
  Target,
  Flag,
  Rocket,
  Smartphone,
  Camera,
  Server,
  Copyright,
  User,
  Cookie,
  Scale,
  Lock,
  Sliders,
  Pencil,
  Clock,
  Shield,
  LayoutDashboard,
  Code,
  LogIn,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  ChevronDown,
  Ban,
} from 'lucide-react';

// Thin wrapper so every icon keeps the old default size ('1em', matching the
// surrounding font-size) unless a caller passes its own width/height — this
// lets every existing usage across the site keep working unchanged while
// rendering real Lucide icons instead of the old hand-drawn SVGs.
function wrap(LucideIcon) {
  return function WrappedIcon(props) {
    return <LucideIcon width="1em" height="1em" {...props} />;
  };
}

export const IconPlay = wrap(Play);
export const IconVideo = wrap(Video);
export const IconMic = wrap(Mic);
export const IconMask = wrap(Drama);
export const IconMusic = wrap(Music);
export const IconSports = wrap(Trophy);
export const IconBroadcast = wrap(RadioTower);
export const IconReplay = wrap(RotateCcw);
export const IconSearch = wrap(Search);
export const IconSun = wrap(Sun);
export const IconMoon = wrap(Moon);
export const IconMenu = wrap(Menu);
export const IconGrid = wrap(Grid);
export const IconDoc = wrap(FileText);
export const IconRss = wrap(Rss);
export const IconLogout = wrap(LogOut);
export const IconPlus = wrap(Plus);
export const IconGlobe = wrap(Globe);
export const IconEye = wrap(Eye);
export const IconTrash = wrap(Trash2);
export const IconBell = wrap(Bell);
export const IconUsers = wrap(Users);
export const IconCalendar = wrap(Calendar);
export const IconShare = wrap(Share2);
export const IconBarChart = wrap(BarChart);
export const IconFolder = wrap(Folder);
export const IconSettings = wrap(Settings);
export const IconTv = wrap(Tv);
export const IconHeadphones = wrap(Headphones);
export const IconLink = wrap(Link);
export const IconImage = wrap(Image);
export const IconMail = wrap(Mail);
export const IconMapPin = wrap(MapPin);
export const IconPhone = wrap(Phone);
export const IconBulb = wrap(Lightbulb);
export const IconTarget = wrap(Target);
export const IconFlag = wrap(Flag);
export const IconRocket = wrap(Rocket);
export const IconSmartphone = wrap(Smartphone);
export const IconCamera = wrap(Camera);
export const IconServer = wrap(Server);
export const IconCopyright = wrap(Copyright);
export const IconUser = wrap(User);
export const IconCookie = wrap(Cookie);
export const IconScale = wrap(Scale);
export const IconLock = wrap(Lock);
export const IconSliders = wrap(Sliders);
export const IconPencil = wrap(Pencil);
export const IconClock = wrap(Clock);
export const IconShield = wrap(Shield);
export const IconLayout = wrap(LayoutDashboard);
export const IconCode = wrap(Code);
export const IconLogIn = wrap(LogIn);
export const IconAlertTriangle = wrap(AlertTriangle);
export const IconUserPlus = wrap(UserPlus);
export const IconRefresh = wrap(RefreshCw);
export const IconChevronDown = wrap(ChevronDown);
export const IconBan = wrap(Ban);

// Brand marks: Lucide dropped social-network logos, so these stay as the
// real, trademark-accurate brand SVGs (a generic icon would be less "real",
// not more, for an actual company logo).
export function IconFacebook(props) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.7h2.6l.4-3h-3v-1.9c0-.9.25-1.5 1.55-1.5H16.6V4.2C16.3 4.16 15.3 4 14.13 4c-2.44 0-4.13 1.49-4.13 4.22v2.08H7.4v3h2.6V21h3.5z" />
    </svg>
  );
}

export function IconWhatsApp(props) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3zm0 1.8a7.2 7.2 0 0 1 6.1 11.1l-.2.3.7 2.6-2.6-.7-.3.2A7.2 7.2 0 1 1 12 4.8z" />
      <path d="M9.1 8c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.2 2.4.9 2.9.7 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.4-.3-.1-1.7-.9-2-1-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.1-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5L9.1 8z" />
    </svg>
  );
}

export function IconYoutube(props) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4s-3.9 0-6.7.2c-.4 0-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.7v1.5C2.2 14 2.4 15.7 2.4 15.7s.2 1.5.8 2.1c.8.8 1.9.8 2.3.9C7.2 19 12 19 12 19s3.9 0 6.7-.3c.4 0 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.7.2-3.5v-1.5c0-1.7-.2-3.5-.2-3.5z" />
      <path d="M10 14.3V9.5l4.6 2.4-4.6 2.4z" fill="var(--surface, #fff)" />
    </svg>
  );
}

export function IconTikTok(props) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 3h-3.2v12.4a2.7 2.7 0 1 1-2-2.6v-3.3a6 6 0 1 0 5.2 6V9.5a7.6 7.6 0 0 0 4.4 1.4V7.7a4.3 4.3 0 0 1-4.4-4.3V3z" />
    </svg>
  );
}

export function IconLinkedIn(props) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.9 8.5H3.6V20h3.3V8.5zM5.3 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM20.4 20h-3.3v-6c0-1.4 0-3.3-2-3.3s-2.3 1.6-2.3 3.2V20H9.5V8.5h3.2v1.6h.1a3.5 3.5 0 0 1 3.1-1.7c3.3 0 3.9 2.2 3.9 5V20z" />
    </svg>
  );
}
