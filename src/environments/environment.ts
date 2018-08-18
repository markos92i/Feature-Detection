// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,

  webrtc_server: 'https://apprtc.appspot.com',
  webrtc_turn_request_url: 'https://computeengineondemand.appspot.com/turn?username=iapprtc&key=4080218913',
  webrtc_turn_referer_url: 'https://appr.tc',
  webrtc_default_turn_server: '',
  webrtc_default_turn_server_user: 'u',
  webrtc_default_turn_server_pass: 'p',
  webrtc_default_stun_server: 'stun:stun.l.google.com:19302'
};
