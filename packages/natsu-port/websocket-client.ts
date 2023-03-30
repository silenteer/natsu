import type {
  NatsPortWSRequest,
  NatsPortWSResponse,
  NatsPortWSErrorResponse,
} from '@silenteer/natsu-type';

const MAX_RETRY_TIMES = 3;
const RETRY_INTERVAL = 5 * 1000;

const waitForOpenConnection = (socket) => {
  return new Promise((resolve, reject) => {
    const maxNumberOfAttempts = 10;

    let currentAttempt = 1;
    const interval = setInterval(() => {
      if (currentAttempt > maxNumberOfAttempts) {
        clearInterval(interval);
        console.log(`readyState: ${socket?.readyState}`);
        reject(new Error('Maximum number of attempts exceeded'));
      } else if (socket.readyState === socket.OPEN) {
        clearInterval(interval);
        resolve(WebSocket.OPEN);
      }
      currentAttempt++;
    }, 1000);
  });
};

class WebsocketClient {
  private _url: string;
  private _webSocket: WebSocket;
  private _webSocketReconnecting = false;
  private _retriedTimes = 0;
  private _reconnectTimeout;
  private _forceQuit = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onopen = (event: Event) => {
    return;
  };
  onmessage = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    event: MessageEvent<string>
  ) => {
    return;
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onclose = (event: CloseEvent) => {
    return;
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onerror = (event: Event) => {
    return;
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onreconnected = (event: Event) => {
    return;
  };

  constructor(url: string) {
    this._url = url;
    this._webSocket = new WebSocket(this._url);
    this._open();
  }

  getReadyState() {
    return this._webSocket ? this._webSocket.readyState : undefined;
  }

  async send(data: NatsPortWSRequest<string>) {
    try {
      await waitForOpenConnection(this._webSocket);
      this._webSocket.send(JSON.stringify(data));
    } catch (error) {
      console.error(`[WebSocket] Error`, error);
      this.onerror(error);
    }
  }

  close() {
    this._forceQuit = true;
    this._webSocket.close();
  }

  private _open() {
    this._webSocket.onopen = (event: Event) => {
      this._retriedTimes = 0;

      if (this._webSocketReconnecting) {
        this._webSocketReconnecting = false;

        console.log(`[WebSocket] Reconnected ${this._url}`);
        this.onreconnected(event);
      } else {
        console.log(`[WebSocket] Opened ${this._url}`);
        this.onopen(event);
      }
    };

    this._webSocket.onmessage = (event: MessageEvent<string>) => {
      this.onmessage(event);
    };

    this._webSocket.onclose = (event: CloseEvent) => {
      this._cleanUp();
      switch (event.code) {
        case 401:
        case 403:
          console.log(`[WebSocket] Closed ${this._url}`, event);
          this.onclose(event);
          break;
        default:
          if (this._forceQuit) {
            console.log(
              `[WebSocket] Closed ${this._url}. Reconnect option is false`,
              event
            );
            this.onclose(event);
            break;
          }

          this._retriedTimes++;
          if (this._retriedTimes > MAX_RETRY_TIMES) {
            console.log(
              `[WebSocket] Closed ${this._url}. Cannot reconnect after ${MAX_RETRY_TIMES} retries`,
              event
            );
            this.onclose(event);
            break;
          }

          console.log(
            `[WebSocket] Will try to reconnect to ${this._url} after ${
              RETRY_INTERVAL / 1000
            } seconds. Attempts ${this._retriedTimes} / ${MAX_RETRY_TIMES}`,
            event
          );
          this._reconnectTimeout = setTimeout(() => {
            console.log(`[WebSocket] Trying to reconnect to ${this._url}`);
            this._webSocketReconnecting = true;
            this._open();
          }, RETRY_INTERVAL);
          break;
      }
    };

    this._webSocket.onerror = (event: Event) => {
      console.error(`[WebSocket] Error`, event);
      this.onerror(event);
    };
  }

  private _cleanUp() {
    this._webSocket.onopen = undefined;
    this._webSocket.onmessage = undefined;
    this._webSocket.onerror = undefined;
    this._webSocket.onclose = undefined;

    this._reconnectTimeout && clearTimeout(this._reconnectTimeout);
    this._reconnectTimeout = undefined;
  }
}

export type { NatsPortWSResponse, NatsPortWSErrorResponse };
export { WebsocketClient };
