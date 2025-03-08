import React from 'react';
import { styled } from '@mui/material/styles';

export const SyntaxHighlight = {
  Keyword: styled('span')({
    color: '#569cd6'
  }),
  Type: styled('span')({
    color: '#4ec9b0'
  }),
  String: styled('span')({
    color: '#ce9178'
  }),
  Comment: styled('span')({
    color: '#6a9955'
  }),
  Number: styled('span')({
    color: '#b5cea8'
  }),
  Function: styled('span')({
    color: '#dcdcaa'
  }),
  Event: styled('span')({
    color: '#c586c0'
  })
};

interface CodeLineProps {
  line: string;
  isStorageSlot?: boolean;
  slotNumber?: string;
}

export const CodeLine = ({ line, isStorageSlot, slotNumber }: CodeLineProps) => {
  const tokenize = (code: string) => {
    const tokens: JSX.Element[] = [];
    let currentIndex = 0;

    const addToken = (end: number, type?: keyof typeof SyntaxHighlight) => {
      const text = code.slice(currentIndex, end);
      tokens.push(
        type ? React.createElement(SyntaxHighlight[type], { key: tokens.length }, text) : <span key={tokens.length}>{text}</span>
      );
      currentIndex = end;
    };

    while (currentIndex < code.length) {
      let matched = false;

      // Comments
      const commentMatch = /^\/\/.*$/.exec(code.slice(currentIndex));
      if (commentMatch) {
        addToken(currentIndex + commentMatch[0].length, 'Comment');
        matched = true;
        continue;
      }

      // Keywords
      const keywordMatch = /^(contract|function|event|struct|mapping|returns|external|view|pure|calldata|memory|storage|private|public|immutable|using|for|if|else|return|new|delete|emit|indexed)\b/.exec(code.slice(currentIndex));
      if (keywordMatch) {
        addToken(currentIndex + keywordMatch[0].length, 'Keyword');
        matched = true;
        continue;
      }

      // Types (including array types) - only match when they are used as types (preceded by whitespace or opening parenthesis)
      const typeMatch = /^(?:(?<=\s)|(?<=\())?(address|uint256|bytes32|string|bool|bytes)(\[\])?(?=[\s,\)])/.exec(code.slice(currentIndex));
      if (typeMatch) {
        addToken(currentIndex + typeMatch[0].length, 'Type');
        matched = true;
        continue;
      }

      // Numbers
      const numberMatch = /^\b\d+\b/.exec(code.slice(currentIndex));
      if (numberMatch) {
        addToken(currentIndex + numberMatch[0].length, 'Number');
        matched = true;
        continue;
      }

      // Function names (after 'function' keyword)
      const functionMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/.exec(code.slice(currentIndex));
      if (functionMatch && tokens.length > 0 && tokens[tokens.length - 1].props?.children === 'function') {
        addToken(currentIndex + functionMatch[0].length, 'Function');
        matched = true;
        continue;
      }

      // Event names (after 'event' keyword)
      const eventMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)/.exec(code.slice(currentIndex));
      if (eventMatch && tokens.length > 0 && tokens[tokens.length - 1].props?.children === 'event') {
        addToken(currentIndex + eventMatch[0].length, 'Event');
        matched = true;
        continue;
      }

      // String literals
      const stringMatch = /^"([^"\\]*(\\.[^"\\]*)*)"/.exec(code.slice(currentIndex));
      if (stringMatch) {
        addToken(currentIndex + stringMatch[0].length, 'String');
        matched = true;
        continue;
      }

      // If no matches found, add one character and continue
      if (!matched) {
        addToken(currentIndex + 1);
      }
    }

    return tokens;
  };

  return (
    <span className={`code-line${isStorageSlot ? ' storage-slot' : ''}`} data-slot={slotNumber}>
      {tokenize(line)}
    </span>
  );
};

export const CodeDisplay = styled('pre')(({ theme }) => ({
  fontFamily: 'monospace',
  margin: 0,
  padding: theme.spacing(2),
  backgroundColor: '#1e1e1e',
  color: '#d4d4d4',
  borderRadius: theme.shape.borderRadius,
  overflow: 'auto',
  lineHeight: '1.6',
  fontSize: '14px',
  '& .code-line': {
    display: 'block',
    position: 'relative',
    padding: '2px 8px',
    '&.storage-slot': {
      backgroundColor: '#2d2d2d',
      borderLeft: '3px solid #569cd6',
      '&::after': {
        content: 'attr(data-slot)',
        position: 'absolute',
        right: theme.spacing(1),
        color: '#4ec9b0',
        fontWeight: 500,
        backgroundColor: '#2d2d2d',
        padding: '0 8px',
        borderRadius: '4px'
      }
    }
  }
})); 