// Preact + htm + signals glue — the single import surface for the UI layer.
import { h, render, Fragment, createRef } from 'preact';
import { useState, useEffect, useRef, useMemo, useCallback, useReducer, useLayoutEffect } from 'preact/hooks';
// Importing @preact/signals installs auto-tracking so components re-render on signal reads.
import { signal, computed, effect, batch, useSignal, useComputed, useSignalEffect, Signal } from '@preact/signals';
import htm from 'htm';

export const html = htm.bind(h);
export {
  h, render, Fragment, createRef,
  useState, useEffect, useRef, useMemo, useCallback, useReducer, useLayoutEffect,
  signal, computed, effect, batch, useSignal, useComputed, useSignalEffect, Signal,
};
