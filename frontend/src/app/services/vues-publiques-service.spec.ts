import { TestBed } from '@angular/core/testing';

import { VuesPubliques } from './vues-publiques';

describe('VuesPubliques', () => {
  let service: VuesPubliques;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VuesPubliques);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
