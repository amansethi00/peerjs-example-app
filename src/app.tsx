// @ts-nocheck
import PeerJs from 'peerjs';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { BrowserRouter, Route, Switch, useHistory } from 'react-router-dom';

let peer;
let connection;
const getUserMedia = navigator.mediaDevices.getUserMedia;

interface ChatMessage {
  id: number;
  self: boolean;
  user: string;
  message: string;
  time: string;
}

const NameInput: React.FC = () => {
  const history = useHistory();
  const [availablePeer, setAvailablePeer] = React.useState(peer);

  const submit = React.useCallback<React.FormEventHandler<HTMLFormElement>>((ev) => {
    const input = ev.currentTarget.elements.namedItem('name') as HTMLInputElement;
    const user = input.value;
    ev.preventDefault();

    setAvailablePeer(
      new PeerJs(user, {
        debug: 3,
        config: {
          iceServers: [
            { url: 'stun:stun01.sipphone.com' },
            { url: 'stun:stun.ekiga.net' },
            { url: 'stun:stun.fwdnet.net' },
            { url: 'stun:stun.ideasip.com' },
            { url: 'stun:stun.iptel.org' },
            { url: 'stun:stun.rixtelecom.se' },
            { url: 'stun:stun.schlund.de' },
            { url: 'stun:stun.l.google.com:19302' },
            { url: 'stun:stun1.l.google.com:19302' },
            { url: 'stun:stun2.l.google.com:19302' },
            { url: 'stun:stun3.l.google.com:19302' },
            { url: 'stun:stun4.l.google.com:19302' },
            { url: 'stun:stunserver.org' },
            { url: 'stun:stun.softjoys.com' },
            { url: 'stun:stun.voiparound.com' },
            { url: 'stun:stun.voipbuster.com' },
            { url: 'stun:stun.voipstunt.com' },
            { url: 'stun:stun.voxgratia.org' },
            { url: 'stun:stun.xten.com' },
            {
              url: 'turn:numb.viagenie.ca',
              credential: 'muazkh',
              username: 'webrtc@live.com',
            },
            {
              url: 'turn:192.158.29.39:3478?transport=udp',
              credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
              username: '28224511:1379330808',
            },
            {
              url: 'turn:192.158.29.39:3478?transport=tcp',
              credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
              username: '28224511:1379330808',
            },
          ],
        },
      }),
    );
  }, []);

  React.useEffect(() => {
    peer = availablePeer;

    if (availablePeer) {
      history.replace('/overview');
    }
  }, [availablePeer]);

  return (
    <form onSubmit={submit}>
      <label>Your name:</label>
      <input name="name" />
      <button>Save</button>
    </form>
  );
};

const Overview: React.FC = () => {
  const history = useHistory();
  const [availablePeer] = React.useState(peer); // this is me
  const peernameref = React.useRef(null);
  const [availableConnection, setAvailableConnection] = React.useState(connection); // this is remote user i am connecting to

  const submit = React.useCallback<React.FormEventHandler<HTMLFormElement>>(
    (ev) => {
      // const input = ev.currentTarget.elements.namedItem('name') as HTMLInputElement;
      // const otherUser = input.value;
      const connection = availablePeer.connect(peernameref.current.value);
      console.log('pname', peernameref.current.value);
      availablePeer.on('error', (err) => console.log('failed to connect'));
      connection['caller'] = availablePeer.id;
      ev.preventDefault();
      setAvailableConnection(connection);
    },
    [availablePeer],
  );

  React.useEffect(() => {
    connection = availableConnection;

    if (!availablePeer) {
      history.replace('/');
    } else if (availableConnection) {
      history.replace('/call');
    } else {
      const handler = (connection: PeerJs.DataConnection) => {
        console.log('data conection established', connection);
        connection['caller'] = connection.peer;
        setAvailableConnection(connection);
      };
      peer.on('connection', handler);
      return () => peer.off('connection', handler);
    }
  }, [availablePeer, availableConnection]);

  return (
    <div>
      <h1>Hi, {availablePeer?.id}</h1>
      {/* <form onSubmit={submit}> */}
      <label>Name to call:</label>
      <input ref={peernameref} name="name" />
      <button onClick={submit}>Call</button>
      {/* </form> */}
    </div>
  );
};

function showVideo(stream: MediaStream, video: HTMLAudioElement, muted: boolean) {
  console.log('stream in showideo', stream);
  console.log('video in showVideo', video);
  if (!stream || !video) {
    console.error('Invalid stream or video element.');
    return;
  }
  video.srcObject = stream;
  // video.volume = muted ? 0 : 1;
  video.volume = 1;
  video.onloadedmetadata = () => video.play();
}
const errorHandler = (err) => {
  console.log('error ', err);
};

function showStream(call: PeerJs.MediaConnection, otherVideo: HTMLVideoElement) {
  const handler = (remoteStream: MediaStream) => {
    console.log('handling stream');
    showVideo(remoteStream, otherVideo, false);
  };
  call.on('stream', handler);
  call.on('error', errorHandler);

  return () => {
    call.off('stream', handler);
    call.off('error', errorHandler);
  };
}

const Call: React.FC = () => {
  const history = useHistory();
  const otherVideo = React.useRef<HTMLAudioElement>();
  const [messages, setMessages] = React.useState<Array<ChatMessage>>([]);
  const [availablePeer] = React.useState(peer);
  const [availableConnection, setAvailableConnection] = React.useState(connection);

  const appendMessage = React.useCallback(
    (message: string, self: boolean) =>
      setMessages((msgs) => [
        ...msgs,
        {
          id: Date.now(),
          message,
          self,
          time: new Date().toLocaleTimeString(),
          user: self ? availablePeer.id : availableConnection.peer,
        },
      ]),
    [],
  );
  console.log('yas', availableConnection, availablePeer);
  const errHandler = (err) => {
    console.log('errored', err);
  };
  React.useEffect(() => {
    availablePeer.on('error', errHandler);
    return () => {
      availablePeer.off('error', errHandler);
    };
  }, []);

  React.useEffect(() => {
    let dispose = () => {};
    if (availableConnection && availablePeer) {
      const handler = async (call: PeerJs.MediaConnection) => {
        console.log('was called graefully');
        const stream = await getUserMedia({ video: false, audio: true });

        // showVideo(stream, selfVideo.current, true);
        call.answer(stream);

        dispose = showStream(call, otherVideo.current);
      };
      (async () => {
        if (availableConnection['caller'] === availablePeer.id) {
          console.log('152', 'was called graefully');
          try {
            const stream = await getUserMedia({ video: false, audio: true });
            console.log('stream', stream);

            // showVideo(stream, selfVideo.current, true);
            dispose = showStream(availablePeer.call(availableConnection.peer, stream), otherVideo.current);
          } catch (e) {
            console.log('eee', e);
          }
        } else {
          console.log('164', 'must have answered before');
          availablePeer.on('call', handler);
          availablePeer.on('error');
        }
      })();

      return () => {
        availablePeer.off('call', handler);
        dispose?.();
      };
    }
  }, [availableConnection, availablePeer]);

  React.useEffect(() => {
    connection = availableConnection;

    if (!availableConnection) {
      history.replace('/overview');
    } else {
      const dataHandler = (message: string) => {
        appendMessage(message, false);
      };
      const closeHandler = () => {
        setAvailableConnection(undefined);
      };
      availableConnection.on('data', dataHandler);
      availableConnection.on('close', closeHandler);
      return () => {
        availableConnection.off('data', dataHandler);
        availableConnection.off('close', closeHandler);
      };
    }
  }, [availableConnection]);

  const submit = React.useCallback<React.FormEventHandler<HTMLFormElement>>(
    (ev) => {
      const input = ev.currentTarget.elements.namedItem('message') as HTMLInputElement;
      const message = input.value;
      ev.preventDefault();
      availableConnection.send(message);
      appendMessage(message, true);
      input.value = '';
    },
    [availableConnection],
  );

  const disconnect = React.useCallback(() => {
    availableConnection.close();
    setAvailableConnection(undefined);
  }, [availableConnection]);

  return (
    <div>
      <h1>
        {availablePeer?.id} ⬄ {availableConnection?.peer} <button onClick={disconnect}>Hang up</button>
      </h1>
      <audio ref={otherVideo} />
      {/* <video ref={selfVideo} width={200} height={200} /> */}
      <div>
        {messages.map((msg) => (
          <p key={msg.id} style={{ color: msg.self ? '#999' : '#222' }}>
            <b>{msg.user}</b> ({msg.time}): {msg.message}
          </p>
        ))}
      </div>
      <form onSubmit={submit}>
        <input name="message" />
        <button>Send</button>
      </form>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/" component={NameInput} />
        <Route exact path="/overview" component={Overview} />
        <Route exact path="/call" component={Call} />
      </Switch>
    </BrowserRouter>
  );
};

ReactDom.render(<App />, document.querySelector('#app'));
