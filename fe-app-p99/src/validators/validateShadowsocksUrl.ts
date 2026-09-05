import { ValidationResult } from './types';
import { isValidPort, parseHostPort } from './hostPort';

function safeBase64Decode(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    return atob(padded);
  } catch (_e) {
    return null;
  }
}

export function validateShadowsocksUrl(url: string): ValidationResult {
  if (!url.startsWith('ss://')) {
    return {
      valid: false,
      message: _('Invalid Shadowsocks URL: must start with ss://'),
    };
  }

  try {
    if (!url || /\s/.test(url)) {
      return {
        valid: false,
        message: _('Invalid Shadowsocks URL: must not contain spaces'),
      };
    }

    let body = url.slice('ss://'.length);
    const hashIdx = body.indexOf('#');
    if (hashIdx >= 0) {
      body = body.slice(0, hashIdx);
    }
    const queryIdx = body.indexOf('?');
    if (queryIdx >= 0) {
      body = body.slice(0, queryIdx);
    }

    let userinfo: string;
    let hostport: string;

    const atIdx = body.lastIndexOf('@');
    if (atIdx >= 0) {
      userinfo = body.slice(0, atIdx);
      hostport = body.slice(atIdx + 1);
    } else {
      // Legacy SIP002 format: ss://base64(method:password@host:port)
      const decoded = safeBase64Decode(body);
      if (!decoded) {
        return {
          valid: false,
          message: _('Invalid Shadowsocks URL: missing server address'),
        };
      }
      const decodedAtIdx = decoded.lastIndexOf('@');
      if (decodedAtIdx < 0) {
        return {
          valid: false,
          message: _('Invalid Shadowsocks URL: missing server address'),
        };
      }
      userinfo = decoded.slice(0, decodedAtIdx);
      hostport = decoded.slice(decodedAtIdx + 1);
    }

    if (!userinfo) {
      return {
        valid: false,
        message: _('Invalid Shadowsocks URL: missing credentials'),
      };
    }

    // Try decoding base64-encoded userinfo if not in plain format
    if (!userinfo.includes(':')) {
      const decodedUserinfo = safeBase64Decode(userinfo);
      if (decodedUserinfo && decodedUserinfo.includes(':')) {
        userinfo = decodedUserinfo;
      }
    }

    if (!userinfo.includes(':') && !userinfo.includes('-')) {
      return {
        valid: false,
        message: _(
          'Invalid Shadowsocks URL: missing method and password separator ":"',
        ),
      };
    }

    if (!hostport) {
      return {
        valid: false,
        message: _('Invalid Shadowsocks URL: missing server address'),
      };
    }

    const parsedHostPort = parseHostPort(hostport);
    if (!parsedHostPort) {
      return {
        valid: false,
        message: _('Invalid Shadowsocks URL: invalid server and port'),
      };
    }

    const { host: server, port } = parsedHostPort;
    if (!server) {
      return {
        valid: false,
        message: _('Invalid Shadowsocks URL: missing server'),
      };
    }

    if (!port) {
      return {
        valid: false,
        message: _('Invalid Shadowsocks URL: missing port'),
      };
    }

    if (!isValidPort(port)) {
      return {
        valid: false,
        message: _('Invalid port number. Must be between 1 and 65535'),
      };
    }
  } catch (_e) {
    return {
      valid: false,
      message: _('Invalid Shadowsocks URL: parsing failed'),
    };
  }

  return { valid: true, message: _('Valid') };
}
