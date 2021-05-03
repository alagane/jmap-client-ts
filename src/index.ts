import { Transport } from './utils/transport';
import {
  IEmailGetResponse,
  IEmailQueryResponse,
  IEmailSetResponse,
  IMailboxGetResponse,
  IMailboxSetResponse,
  ISession,
  IEmailGetArguments,
  IMailboxGetArguments,
  IMailboxSetArguments,
  IReplaceableAccountId,
  IEmailQueryArguments,
  IEmailSetArguments,
  IMailboxChangesArguments,
  IMailboxChangesResponse,
  IEmailSubmissionSetArguments,
  IEmailSubmissionGetResponse,
  IEmailSubmissionGetArguments,
  IEmailSubmissionChangesArguments,
  IEmailSubmissionSetResponse,
  IEmailSubmissionChangesResponse,
  IEmailChangesArguments,
  IEmailChangesResponse,
  IRequestNameMap,
  IResponseNameMap,
  IInvocationResponse,
} from './types';

export class Client {
  private readonly DEFAULT_USING = ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'];

  private transport: Transport;
  private httpHeaders: { [headerName: string]: string };

  private sessionUrl: string;
  private overriddenApiUrl?: string;
  private session?: ISession;

  constructor({
    sessionUrl,
    accessToken,
    overriddenApiUrl,
    transport,
    httpHeaders,
  }: {
    sessionUrl: string;
    accessToken: string;
    overriddenApiUrl?: string;
    transport: Transport;
    httpHeaders?: { [headerName: string]: string };
  }) {
    this.sessionUrl = sessionUrl;
    if (overriddenApiUrl) {
      this.overriddenApiUrl = overriddenApiUrl;
    }
    this.transport = transport;
    this.httpHeaders = {
      Accept: 'application/json;jmapVersion=rfc-8621',
      Authorization: `Bearer ${accessToken}`,
      ...(httpHeaders ? httpHeaders : {}),
    };
  }

  public fetchSession(): Promise<void> {
    const sessionPromise = this.transport.get<ISession>(this.sessionUrl, this.httpHeaders);
    return sessionPromise.then(session => {
      this.session = session;
      return;
    });
  }

  public getSession(): ISession {
    if (!this.session) {
      throw new Error('Undefined session, should call fetchSession and wait for its resolution');
    }
    return this.session;
  }

  public getAccountIds(): string[] {
    const session = this.getSession();

    return Object.keys(session.accounts);
  }

  public getFirstAccountId(): string {
    const accountIds = this.getAccountIds();

    if (accountIds.length === 0) {
      throw new Error('No account available for this session');
    }

    return accountIds[0];
  }

  public mailbox_get(args: IMailboxGetArguments): Promise<IMailboxGetResponse> {
    return this.request('Mailbox/get', args);
  }

  public mailbox_changes(args: IMailboxChangesArguments): Promise<IMailboxChangesResponse> {
    return this.request('Mailbox/changes', args);
  }

  public mailbox_set(args: IMailboxSetArguments): Promise<IMailboxSetResponse> {
    return this.request('Mailbox/set', args);
  }

  public email_get(args: IEmailGetArguments): Promise<IEmailGetResponse> {
    return this.request('Email/get', args);
  }

  public email_changes(args: IEmailChangesArguments): Promise<IEmailChangesResponse> {
    return this.request('Email/changes', args);
  }

  public email_query(args: IEmailQueryArguments): Promise<IEmailQueryResponse> {
    return this.request('Email/query', args);
  }

  public email_set(args: IEmailSetArguments): Promise<IEmailSetResponse> {
    return this.request('Email/set', args);
  }

  public emailSubmission_get(
    args: IEmailSubmissionGetArguments,
  ): Promise<IEmailSubmissionGetResponse> {
    return this.request('EmailSubmission/get', args);
  }

  public emailSubmission_changes(
    args: IEmailSubmissionChangesArguments,
  ): Promise<IEmailSubmissionChangesResponse> {
    return this.request('EmailSubmission/changes', args);
  }

  public emailSubmission_set(
    args: IEmailSubmissionSetArguments,
  ): Promise<IEmailSubmissionSetResponse> {
    return this.request('EmailSubmission/set', args);
  }

  private request<MethodName extends keyof IRequestNameMap>(
    methodName: MethodName,
    args: IRequestNameMap[MethodName],
  ): Promise<IResponseNameMap[MethodName]> {
    const apiUrl = this.overriddenApiUrl || this.getSession().apiUrl;
    return this.transport
      .post<{
        sessionState: string;
        methodResponses: [IInvocationResponse<MethodName> | IInvocationResponse<'error'>];
      }>(
        apiUrl,
        {
          using: this.getCapabilities(),
          methodCalls: [[methodName, this.replaceAccountId(args), '0']],
        },
        this.httpHeaders,
      )
      .then(response => {
        const methodResponse = response.methodResponses[0];

        if (methodResponse[0] === 'error') {
          throw methodResponse[1];
        }

        return methodResponse[1] as IResponseNameMap[MethodName];
      });
  }

  private replaceAccountId<U extends IReplaceableAccountId>(input: U): U {
    return input.accountId !== null
      ? input
      : {
          ...input,
          accountId: this.getFirstAccountId(),
        };
  }

  private getCapabilities() {
    return this.session?.capabilities ? Object.keys(this.session.capabilities) : this.DEFAULT_USING;
  }
}
