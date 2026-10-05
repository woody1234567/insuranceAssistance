import logoPng from "../assets/logo.png";
import robotPng from "../assets/robot.png";
import newchatPng from "../assets/newchat.png";
import userPng from "../assets/user.png";
import sendPng from "../assets/send.png";
import arrowleftPng from "../assets/arrow-left.png";
import arrowrightPng from "../assets/arrow-right.png";

export const LogoIcon = (p) => <img src={logoPng} alt="玉山銀行" {...p} />;

export const RobotIcon = (p) => <img src={robotPng} alt="助理" {...p} />;

export const NewChatIcon = (p) => <img src={newchatPng} alt="新對話" {...p} />;

export const SettingsIcon = (p) => <img src={userPng} alt="設定" {...p} />;

export const SendIcon = (p) => <img src={sendPng} alt="傳送" {...p} />;

export const ChevronsLeft = (p) => <img src={arrowleftPng} alt="收起" {...p} />;

export const ChevronsRight = (p) => <img src={arrowrightPng} alt="展開" {...p} />;
