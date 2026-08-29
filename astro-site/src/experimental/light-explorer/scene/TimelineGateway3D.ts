import { LIGHT_ERAS, type LightEra } from '../data/eras';

export interface TimelineGatewayCallbacks {
  onSelectEra?: (era: LightEra) => void;
  onEnterLaboratory?: (eraId: string) => void;
}

export class TimelineGatewayManager {
  private container: HTMLElement;
  private activeEraIndex = 0;
  private callbacks: TimelineGatewayCallbacks;

  constructor(container: HTMLElement, callbacks: TimelineGatewayCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.setupKeyboardNavigation();
  }

  public getActiveEra(): LightEra {
    return LIGHT_ERAS[this.activeEraIndex];
  }

  public selectEraByIndex(index: number): void {
    if (index < 0 || index >= LIGHT_ERAS.length) return;
    this.activeEraIndex = index;
    const era = LIGHT_ERAS[this.activeEraIndex];

    if (this.callbacks.onSelectEra) {
      this.callbacks.onSelectEra(era);
    }
  }

  public selectEraById(eraId: string): void {
    const idx = LIGHT_ERAS.findIndex((e) => e.id === eraId);
    if (idx !== -1) {
      this.selectEraByIndex(idx);
    }
  }

  public nextEra(): void {
    const nextIdx = (this.activeEraIndex + 1) % LIGHT_ERAS.length;
    this.selectEraByIndex(nextIdx);
  }

  public prevEra(): void {
    const prevIdx = (this.activeEraIndex - 1 + LIGHT_ERAS.length) % LIGHT_ERAS.length;
    this.selectEraByIndex(prevIdx);
  }

  public enterActiveLaboratory(): void {
    const era = this.getActiveEra();
    if (era.status === 'available' && era.route && this.callbacks.onEnterLaboratory) {
      this.callbacks.onEnterLaboratory(era.id);
    }
  }

  private setupKeyboardNavigation(): void {
    window.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in an input
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.nextEra();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.prevEra();
      } else if (e.key === 'Enter') {
        if (this.getActiveEra().status === 'available') {
          e.preventDefault();
          this.enterActiveLaboratory();
        }
      }
    });
  }
}
