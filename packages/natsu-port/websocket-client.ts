import type { Socket } from 'socket.io-client';
import socket from 'socket.io-client';
import type {
  NatsPortWSRequest,
  NatsPortWSResponse,
  NatsPortWSErrorResponse,
} from '@silenteer/natsu-type';

class WebsocketClient {
  private _webSocket: Socket;

  constructor(
    private _params: {
      url: string;
      withCredentials?: boolean;
      headers?: {
        [key: string]: string;
      };
      onMessage: (data: string) => void;
      onConnect: () => void;
      onReConnect: () => void;
    }
  ) {
    const { url, withCredentials, headers, onMessage, onConnect, onReConnect } =
      _params;

    this._webSocket = socket(url, {
      extraHeaders: headers,
      withCredentials,
      autoConnect: true,
    });
    this._webSocket.on('message', onMessage);
    this._webSocket.on('connect', onConnect);
    this._webSocket.on('reconnect', onReConnect);

    this._webSocket.connect();
  }

  isConnected = () => {
    return this._webSocket?.connected || false;
  };

  send = async (data: NatsPortWSRequest<string>) => {
    if (this.isConnected) {
      this._webSocket.send(JSON.stringify(data));
    }
  };

  close = () => {
    this._webSocket.off('message', this._params.onMessage);
    this._webSocket.off('connect', this._params.onConnect);
    this._webSocket.off('reconnect', this._params.onReConnect);
    this._webSocket.close();
  };
}

export type { NatsPortWSResponse, NatsPortWSErrorResponse };
export { WebsocketClient };
