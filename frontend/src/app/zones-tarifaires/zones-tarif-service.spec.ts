import { TestBed } from '@angular/core/testing';

import { ZonesTarifService } from './zones-tarif-service';

describe('ZonesTarifService', () => {
  let service: ZonesTarifService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ZonesTarifService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
