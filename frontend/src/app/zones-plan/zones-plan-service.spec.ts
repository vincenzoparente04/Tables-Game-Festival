import { TestBed } from '@angular/core/testing';

import { ZonesPlanService } from './zones-plan-service';

describe('ZonesPlanService', () => {
  let service: ZonesPlanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ZonesPlanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
